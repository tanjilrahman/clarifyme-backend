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

export interface SubscriptionInfo {
  adminEmail: string;
  subscriptionType: 'Started' | 'Canceled';
}

const baseUrl = 'https://dashboard.clarifyme.ai';

export const SubscriptionEmail = ({
  adminEmail,
  subscriptionType,
}: SubscriptionInfo) => {
  const currentDate = new Date(); // Get the current date
  const futureDate = new Date(currentDate); // Create a new Date object based on the current date

  futureDate.setDate(currentDate.getDate() + 7); // Add 7 days to the current date

  return (
    <Html>
      <Head />
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
              Subscription <strong>{subscriptionType}!</strong>
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">Hi!</Text>
            <Text className="text-black text-[14px] leading-[24px]">
              You're subscription for the account <strong>{adminEmail}</strong>{' '}
              has been {subscriptionType}!
            </Text>
            {subscriptionType === 'Started' && (
              <Section className="text-center mt-[32px] mb-[32px]">
                <Button
                  className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                  href={`${baseUrl}/manage`}
                >
                  View Subscription
                </Button>
              </Section>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SubscriptionEmail;
