import {
    Body,
    Button,
    Container,
    Column,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Row,
    Section,
    Text,
    Tailwind,
  } from "@react-email/components";
  
  export interface ConfirmAppointmentInfo {
    candidateName: string;
    candidateEmail: string;
    recruiterEmail: string;
    dateTime: string;
    meetingLink: string;
    topic: string;
}
  
  const baseUrl = 'https://dashboard.clarifyme.ai'
  
  export const AppointmentConfirmationEmail = ({
    candidateName,
    candidateEmail,
    recruiterEmail,
    dateTime,
    topic,
    meetingLink,
  }: ConfirmAppointmentInfo) => {
    const previewText = `You got an Appointment!`;
  
    return (
      <Html>
        <Head />
        <Preview>{previewText}</Preview>
        <Tailwind>
          <Body className="bg-white my-auto mx-auto font-sans px-2">
            <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
              <Section className="mt-[32px]">
                <Img
                  src={`${baseUrl}/assets/logo-448ffabf.png`}
                  width="180"
                  height="37"
                  alt="Clarifyme logo"
                  className="my-0 mx-auto"
                />
              </Section>
              <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Appointment <strong>Scheduled!</strong>
              </Heading>
              <Text className="text-black text-[14px] leading-[24px]">
                Hello {candidateName},
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                You're appointment for <strong>{topic}</strong> is scheduled at <strong>{dateTime}</strong>. Please be on time on the below meeting link.
              </Text>
              <Section className="text-center mt-[32px] mb-[32px]">
                <Button
                  className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                  href={meetingLink}
                >
                  Meeting Link
                </Button>
              </Section>
              <Text className="text-black text-[14px] leading-[24px]">
                or copy and paste this URL into your browser:{" "} <br />
                <Link href={meetingLink} className="text-blue-600 no-underline">
                  {meetingLink}
                </Link>
              </Text>
              {/* <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
              <Text className="text-[#666666] text-[12px] leading-[24px]">
                This invitation was intended for{" "}
                <span className="text-black">{username}</span>. This invite was
                sent from <span className="text-black">{inviteFromIp}</span>{" "}
                located in{" "}
                <span className="text-black">{inviteFromLocation}</span>. If you
                were not expecting this invitation, you can ignore this email. If
                you are concerned about your account's safety, please reply to
                this email to get in touch with us.
              </Text> */}
            </Container>
          </Body>
        </Tailwind>
      </Html>
    );
  };

  
  export default AppointmentConfirmationEmail;
  