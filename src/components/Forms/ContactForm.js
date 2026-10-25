import WebForm from "@/components/Forms/WebForm";

const emailPattern = { value: /^\S+@\S+$/i, message: "Indtast venligst en gyldig e-mailadresse" };

const fields = [
    { id: "name", name: "name", label: "Navn", rules: { required: "Udfyld venligst dit fornavn" } },
    { id: "email_address", name: "email", label: "E-mail", type: "email", rules: { required: "Udfyld venligst din e-mailadresse", pattern: emailPattern } },
    { id: "message", name: "message", label: "Besked", multiline: true, rules: { required: "Udfyld venligst tekstfeltet" } },
];

export default function ContactForm({ onClose }) {
    return (
        <WebForm
            accessKey="9d6f17d5-552d-4290-aef5-241c8b4579ff"
            fromName="Genhør | Kontakt"
            subject="Ny besked"
            fields={fields}
            submitLabel="Send besked"
            successMessage="Tak for din besked."
            onClose={onClose}
        />
    );
}
