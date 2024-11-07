import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { ConfirmAppointmentInfo } from "@/emails/appointment-confirmation";
import axios from "axios";
import type { Request, RequestHandler, Response } from "express";
import { type Meeting, createTeamsMeeting, createZoomMeeting } from "./meetingService";
import { saveTokens } from "./tokenService";

class MeetingController {
  public createZoomMeeting: RequestHandler = async (req: Request, res: Response) => {
    const meeting: Meeting = req.body;

    const serviceResponse = await createZoomMeeting(meeting);

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

  public createTeamsMeeting: RequestHandler = async (req: Request, res: Response) => {
    const meeting: Meeting = req.body;

    const serviceResponse = await createTeamsMeeting(meeting);

    const emailPayload: ConfirmAppointmentInfo = {
      candidateEmail: meeting.candidateEmail,
      candidateName: meeting.candidateName,
      dateTime: meeting.dateTime,
      recruiterEmail: meeting.recruiterEmail,
      topic: meeting.topic,
      meetingLink: serviceResponse.responseObject.teams.onlineMeeting.joinUrl,
    };
    await axios.post(`${process.env.SERVER_URL}/email/send-confirm-appointment`, emailPayload);
    return handleServiceResponse(serviceResponse, res);
  };

  public zoomOAuth: RequestHandler = async (req: Request, res: Response) => {
    const recruiterId = req.query.recruiterId as string;

    if (recruiterId) {
      const clientId = process.env.ZOOM_API_KEY;
      const redirectUri = encodeURIComponent(process.env.REDIRECT_URI_ZOOM || "");
      const responseType = "code";
      const authorizationUrl = `https://zoom.us/oauth/authorize?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectUri}&state=${recruiterId}`;
      res.redirect(authorizationUrl);
    }
  };

  public teamsOAuth: RequestHandler = async (req: Request, res: Response) => {
    const recruiterId = req.query.recruiterId as string;

    if (recruiterId) {
      const clientId = process.env.AZURE_CLIENT_ID;
      const redirectUri = encodeURIComponent(process.env.REDIRECT_URI_TEAMS || "");
      const responseType = "code";
      const responseMode = "query";
      const scope = "Calendars.ReadWrite+offline_access";
      const authorizationUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${redirectUri}&response_mode=${responseMode}&scope=${scope}&state=${recruiterId}`;
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
          redirect_uri: process.env.REDIRECT_URI_ZOOM,
        },
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // Here, you would typically save the access and refresh tokens
      const { access_token, refresh_token } = response.data;
      await saveTokens(recruiterId, access_token, refresh_token, "zoomTokens");

      // Send a response to the user (you can redirect or send a message)
      res.redirect(`${process.env.CORS_ORIGIN}/interviews`);
    } catch (error) {
      console.error("Error obtaining token:", error);
      res.status(500).send("Error obtaining token");
    }
  };

  public teamsOAuthCallback: RequestHandler = async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const recruiterId = req.query.state as string;

    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      const response = await axios.post(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          grant_type: "authorization_code",
          code: code,
          redirect_uri: process.env.REDIRECT_URI_TEAMS,
          client_secret: process.env.AZURE_CLIENT_SECRET,
          scope: "Calendars.ReadWrite offline_access",
          client_id: process.env.AZURE_CLIENT_ID,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const { access_token, refresh_token } = response.data;

      // Check if the user has MS teams
      const responseAcc = await axios.get("https://graph.microsoft.com/v1.0/me/calendar", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      });

      const { defaultOnlineMeetingProvider } = responseAcc.data;

      // Here, you would typically save the access and refresh tokens
      if (defaultOnlineMeetingProvider === "teamsForBusiness") {
        await saveTokens(recruiterId, access_token, refresh_token, "teamsTokens");
        res.redirect(`${process.env.CORS_ORIGIN}/interviews`);
      } else {
        res.redirect(`${process.env.CORS_ORIGIN}/interviews?no_teams=1`);
      }

      // Send a response to the user (you can redirect or send a message)
    } catch (error) {
      console.error("Error obtaining token:", error);
      res.status(500).send("Error obtaining token");
    }
  };
}

export const meetingController = new MeetingController();
