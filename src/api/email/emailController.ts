import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import AppointmentConfirmationEmail, { type ConfirmAppointmentInfo } from "@/emails/appointment-confirmation";
import AppointmentEmail, { type AppointmentInfo } from "@/emails/appointment-invite";
import { logger } from "@/server";
import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Resend } from "resend";

class EmailController {
  public sendAppointment: RequestHandler = async (req: Request, res: Response) => {
    try {
      const appointmentInfo: AppointmentInfo = req.body;

      const resend = new Resend(process.env.RESEND_API_KEY);

      const response = await resend.emails.send({
        from: "Clarifyme.ai <support@clarifyme.ai>",
        to: appointmentInfo.candidateEmail,
        subject: `Appointment for ${appointmentInfo.jobTitle}`,
        react: AppointmentEmail(appointmentInfo),
      });

      if (response.data) {
        const serviceResponse = ServiceResponse.success("Appointment sent!", response.data);
        return handleServiceResponse(serviceResponse, res);
      } else {
        const serviceResponse = ServiceResponse.failure("Error!", response.error);
        return handleServiceResponse(serviceResponse, res);
      }
    } catch (error) {
      const errorMessage = `Error sending email: $${(error as Error).message}`;
      logger.error(errorMessage);
      const serviceResponse = ServiceResponse.failure(
        "An error occurred while sending email.",
        error,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  public confirmAppointment: RequestHandler = async (req: Request, res: Response) => {
    try {
      const confirmAppointmentInfo: ConfirmAppointmentInfo = req.body;

      const resend = new Resend(process.env.RESEND_API_KEY);

      const response = await resend.emails.send({
        from: "Clarifyme.ai <support@clarifyme.ai>",
        to: confirmAppointmentInfo.candidateEmail,
        bcc: confirmAppointmentInfo.recruiterEmail,
        subject: `Appointment scheduled for ${confirmAppointmentInfo.topic}`,
        react: AppointmentConfirmationEmail(confirmAppointmentInfo),
      });

      if (response.data) {
        const serviceResponse = ServiceResponse.success("Email sent!", response.data);
        return handleServiceResponse(serviceResponse, res);
      } else {
        const serviceResponse = ServiceResponse.failure("Error!", response.error);
        return handleServiceResponse(serviceResponse, res);
      }
    } catch (error) {
      const errorMessage = `Error sending email: $${(error as Error).message}`;
      logger.error(errorMessage);
      const serviceResponse = ServiceResponse.failure(
        "An error occurred while sending email.",
        error,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };
}

export const emailController = new EmailController();
