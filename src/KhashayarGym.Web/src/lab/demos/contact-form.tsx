// 21st demo: Contact Form (id 35258)
import ContactForm from "@/components/ui/contact-form";

export default function ContactFormDemo() {
  return (
    <ContactForm
      onSubmit={async () => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }}
    />
  );
}
