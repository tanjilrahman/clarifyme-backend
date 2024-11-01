import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { ConfirmAppointmentInfo } from "@/emails/appointment-confirmation";
import axios from "axios";
import type { Request, RequestHandler, Response } from "express";
import { type Meeting, createMeeting } from "./meetingService";
import { saveTokens } from "./tokenService";

class MeetingController {
  public createZoomMeeting: RequestHandler = async (req: Request, res: Response) => {
    const meeting: Meeting = req.body;

    const serviceResponse = await createMeeting(meeting);

    const emailPayload: ConfirmAppointmentInfo = {
      candidateEmail: meeting.candidateEmail,
      candidateName: meeting.candidateName,
      dateTime: meeting.dateTime,
      recruiterEmail: meeting.recruiterEmail,
      topic: meeting.topic,
      meetingLink: serviceResponse.responseObject.zoom.join_url,
    };
    await axios.post(`${process.env.SERVER_URL}/email/send-confirm-appointment`, emailPayload);
    return handleServiceResponse(serviceResponse, res);
  };

  public zoomOAuth: RequestHandler = async (req: Request, res: Response) => {
    const recruiterId = req.query.recruiterId as string;

    if (recruiterId) {
      const clientId = process.env.ZOOM_API_KEY;
      const redirectUri = encodeURIComponent(process.env.REDIRECT_URI || "");
      const responseType = "code";
      const authorizationUrl = `https://zoom.us/oauth/authorize?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectUri}&state=${recruiterId}`;
      res.redirect(authorizationUrl);
    }
  };

  public zoomOAuthCallback: RequestHandler = async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const recruiterId = req.query.state as string;

    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      const response = await axios.post("https://zoom.us/oauth/token", null, {
        params: {
          grant_type: "authorization_code",
          code: code,
          redirect_uri: process.env.REDIRECT_URI,
        },
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // Here, you would typically save the access and refresh tokens
      const { access_token, refresh_token } = response.data;
      await saveTokens(recruiterId, access_token, refresh_token);

      // Send a response to the user (you can redirect or send a message)
      res.redirect(`${process.env.DASHBOARD_URL}/interviews`);
    } catch (error) {
      console.error("Error obtaining token:", error);
      res.status(500).send("Error obtaining token");
    }
  };
}

export const meetingController = new MeetingController();
