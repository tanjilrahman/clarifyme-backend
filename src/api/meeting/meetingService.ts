import { ServiceResponse } from "@/common/models/serviceResponse";
import axios from "axios";
import { getTokens, updateTokens } from "./tokenService";

export interface Meeting {
  candidateName: string;
  candidateEmail: string;
  recruiterEmail: string;
  dateTime: string;
  recruiterId: string;
  topic: string;
  start_time: string;
  type: number;
  duration: number;
  timezone: string;
  agenda: string;
}

// Create a meeting
async function createMeeting(meeting: Meeting): Promise<any> {
  const tokens = await getTokens(meeting.recruiterId);
  if (!tokens) return console.error("No valid tokens found.");

  try {
    const response = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      {
        topic: meeting.topic,
        type: meeting.type,
        start_time: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        agenda: meeting.agenda,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0,
          audio: "both",
          auto_recording: "none",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      },
    );
    return ServiceResponse.success("Meeting generated", { zoom: response.data });
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      console.log("Access token expired. Refreshing token...");
      await refreshAndRetryMeeting(meeting);
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
async function refreshAndRetryMeeting(meeting: Meeting): Promise<void> {
  const tokens = await getTokens(meeting.recruiterId);
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
    await updateTokens(meeting.recruiterId, newAccessToken, newRefreshToken);

    // Retry creating the meeting with the new access token
    await createMeeting(meeting);
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
}

export { createMeeting };
