import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface AhaEmailProps {
  productName: string;
}

export function AhaEmail({ productName }: AhaEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You did it — aha moment reached in {productName}!</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", padding: "40px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "24px", fontWeight: "700", color: "#111827" }}>
            You did it! 🎉
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", lineHeight: "1.6" }}>
            You&apos;ve completed the core setup in {productName}. You&apos;re now among the users
            who get the most out of the product — this is where it gets good.
          </Text>
          <Text style={{ fontSize: "14px", color: "#6b7280" }}>
            — The {productName} team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AhaEmail;
