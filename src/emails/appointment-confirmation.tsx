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
  dateTimeCandidate: string;
  dateTimeRecuriter: string;
  meetingLink: string;
  topic: string;
}
  
  const baseUrl = 'https://dashboard.clarifyme.ai'
  
  export const AppointmentConfirmationEmail = ({
    candidateName,
    candidateEmail,
    recruiterEmail,
    dateTimeCandidate,
    dateTimeRecuriter,
    topic,
    meetingLink,
  }: ConfirmAppointmentInfo, type: "candidate" | "recruiter") => {
    const previewText = `You got an Appointment!`;
    const dateTime = type === "candidate" ? dateTimeCandidate : dateTimeRecuriter
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
                {type === "candidate" ? `Hello ${candidateName},` : "Hi,"}
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                You're appointment for <strong>{topic}</strong> {type === "recruiter" && `with ${candidateName}`} is scheduled at <strong>{dateTime}</strong>. Please be on time on the below meeting link.
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
            </Container>
          </Body>
        </Tailwind>
      </Html>
    );
  };

  
  export default AppointmentConfirmationEmail;
  