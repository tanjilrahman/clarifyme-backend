import { ServiceResponse } from "@/common/models/serviceResponse";
import axios from "axios";
import { getTokens, updateTokens } from "./tokenService";

export interface Meeting {
  candidateName: string;
  candidateEmail: string;
  recruiterEmail: string;
  recruiterId: string;
  topic: string;
  timezone: string;
}

// Create a zoom meeting
async function createZoomMeeting(meeting: Meeting): Promise<any> {
  const tokens = await getTokens(meeting.recruiterId, "zoomTokens");
  if (!tokens) return ServiceResponse.failure("No valid tokens found.", null);

  try {
    const meetingData = {
      topic: meeting.topic,
      type: 3,
      duration: 30,
      timezone: meeting.timezone,
      settings: {
        host_video: true,
        participant_video: true,
      },
    };
    const response = await axios.post("https://api.zoom.us/v2/users/me/meetings", meetingData, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    return ServiceResponse.success("Meeting generated", { zoom: response.data });
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      console.log("Access token expired. Refreshing token...");
      await refreshAndRetryZoomMeeting(meeting);
    } else {
      console.error("Error creating meeting:", error);
      return ServiceResponse.failure(
        "Failed to create meeting",
        error.response?.data?.message || "An unknown error occurred",
      );
    }
  }
}

// Create a teams meeting
async function createTeamsMeeting(meeting: Meeting): Promise<any> {
  const tokens = await getTokens(meeting.recruiterId, "teamsTokens");
  if (!tokens) return ServiceResponse.failure("No valid tokens found.", null);

  try {
    const start_time = new Date().toISOString();
    const end_time = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await axios.post(
      "https://graph.microsoft.com/v1.0/me/calendar/events",
      {
        subject: meeting.topic,
        body: {
          contentType: "HTML",
          content: "Discuss job role and expectations.",
        },
        start: {
          dateTime: start_time,
          timeZone: "Pacific Standard Time",
        },
        end: {
          dateTime: end_time,
          timeZone: "Pacific Standard Time",
        },
        location: {
          displayName: `Online meeting on ${meeting.topic}`,
        },
        attendees: [
          {
            emailAddress: {
              address: meeting.candidateEmail,
              name: meeting.candidateName,
            },
            type: "required",
          },
        ],
        allowNewTimeProposals: true,
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
      },
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
          Prefer: `outlook.timezone="Pacific Standard Time"`,
        },
      },
    );
    return ServiceResponse.success("Meeting generated", { teams: response.data });
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      console.log("Access token expired. Refreshing token...");
      await refreshAndRetryTeamsMeeting(meeting);
    } else {
      console.error("Error creating meeting:", error);
      return ServiceResponse.failure(
        "Failed to create meeting",
        error.response?.data?.message || "An unknown error occurred",
      );
    }
  }
}

// Refresh the token and retry the meeting creation
async function refreshAndRetryZoomMeeting(meeting: Meeting): Promise<void> {
  const tokens = await getTokens(meeting.recruiterId, "zoomTokens");
  if (!tokens) return console.error("No valid tokens found.");

  try {
    const response = await axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    // Update Firestore with the new tokens
    await updateTokens(meeting.recruiterId, newAccessToken, newRefreshToken, "zoomTokens");

    // Retry creating the meeting with the new access token
    await createZoomMeeting(meeting);
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
}

// Refresh the token and retry the meeting creation
async function refreshAndRetryTeamsMeeting(meeting: Meeting): Promise<void> {
  const tokens = await getTokens(meeting.recruiterId, "teamsTokens");
  if (!tokens) return console.error("No valid tokens found.");

  try {
    const response = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
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

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    // Update Firestore with the new tokens
    await updateTokens(meeting.recruiterId, newAccessToken, newRefreshToken, "teamsTokens");

    // Retry creating the meeting with the new access token
    await createTeamsMeeting(meeting);
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
}

export { createZoomMeeting, createTeamsMeeting };
