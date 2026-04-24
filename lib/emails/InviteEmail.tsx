import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InviteEmailProps {
  productName: string;
  inviteUrl: string;
}

export function InviteEmail({ productName, inviteUrl }: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;ve been invited to join {productName}.</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", padding: "40px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "24px", fontWeight: "700", color: "#111827" }}>
            You&apos;ve been invited to {productName}
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", lineHeight: "1.6" }}>
            A teammate has invited you to join them on {productName}.
          </Text>
          <Link
            href={inviteUrl}
            style={{
              display: "inline-block",
              backgroundColor: "#111827",
              color: "#ffffff",
              borderRadius: "6px",
              padding: "12px 24px",
              fontSize: "15px",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            Accept invitation
          </Link>
          <Text style={{ fontSize: "14px", color: "#6b7280", marginTop: "24px" }}>
            — The {productName} team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InviteEmail;
