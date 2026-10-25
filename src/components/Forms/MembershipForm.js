import WebForm from "@/components/Forms/WebForm";

const emailPattern = { value: /^\S+@\S+$/i, message: "Indtast venligst en gyldig e-mailadresse" };

const fields = [
    { id: "fname", name: "fname", label: "Fornavn", rules: { required: "Udfyld venligst dit fornavn" } },
    { id: "lname", name: "lname", label: "Efternavn", rules: { required: "Udfyld venligst dit efternavn" } },
    { id: "birthday", name: "birthday", label: "Fødselsdato", rules: { required: "Udfyld venligst din fødselsdato" } },
    { id: "email_address", name: "email", label: "E-mail", type: "email", rules: { required: "Udfyld venligst din e-mailadresse", pattern: emailPattern } },
    { id: "phone", name: "phone", label: "Telefon", type: "tel", inputProps: { inputMode: "numeric", pattern: "[0-9]*", maxLength: 8 }, rules: { required: "Udfyld venligst dit telefonnummer" } },
];

export default function MembershipForm({ onClose }) {
    return (
        <WebForm
            accessKey="d3a3ed6e-3d70-4c5a-a0c4-84bd405cd459"
            fromName="Genhør | Medlemskab"
            subject="Nyt medlemskab"
            fields={fields}
            submitLabel="Bliv medlem"
            successMessage="Tak for din tilmelding!"
            onClose={onClose}
        />
    );
}
