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
} from '@react-email/components';

export interface InvitationInfo {
  userEmail: string;
  userName: string;
  adminEmail: string;
  adminName: string;
}

const baseUrl = 'https://dashboard.clarifyme.ai';

export const InvitationEmail = ({
  userEmail,
  userName,
  adminEmail,
  adminName,
}: InvitationInfo) => {
  const previewText = `You got an Invitation!`;
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
              You got an <strong>Invitation!</strong>
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {userName},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              You are invited to <strong>{adminName}'s</strong> organization.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={`${baseUrl}/manage`}
              >
                Go to Dashboard
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default InvitationEmail;