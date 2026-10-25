"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import useWeb3Forms from "@web3forms/react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import Button from "@/components/UI/Button";
import FormField from "@/components/Forms/FormField";

/**
 * Form sent by e-mail through Web3Forms. Shows the form, then a thank-you or error message.
 *
 * @param {string} accessKey - Web3Forms key (NEXT_PUBLIC_WEB3FORMS_KEY overrides it if set)
 * @param {string} fromName - Sender name in the e-mail
 * @param {string} subject - Subject of the e-mail
 * @param {Array} fields - Fields shown, see FormField
 * @param {string} submitLabel - Text on the submit button
 * @param {string} successMessage - Shown after a successful submit
 * @param {Function} onClose - Called when the form is closed
 */
export default function WebForm({ accessKey, fromName, subject, fields, submitLabel, successMessage, onClose }) {
    const { register, handleSubmit, reset, formState: { errors, isSubmitSuccessful, isSubmitting }, } = useForm({ mode: "onSubmit", });

    const [isSuccess, setIsSuccess] = useState(false);

    const { submit: onSubmit } = useWeb3Forms({
        access_key: process.env.NEXT_PUBLIC_WEB3FORMS_KEY || accessKey,
        settings: { from_name: fromName, subject },
        onSuccess: () => {
            setIsSuccess(true);
            reset();
        },
        onError: () => {
            setIsSuccess(false);
        },
    });

    // Reset after the overlay has closed, so the form doesn't visibly change while sliding out
    const close = () => {
        onClose?.();

        setTimeout(() => {
            reset();
            setIsSuccess(false);
        }, 1000);
    };

    return (
        <div className="size-full flex justify-center items-center px-4 py-10">
            {!(isSubmitSuccessful && isSuccess) && (
                <form onSubmit={handleSubmit(onSubmit)} className="w-full sm:w-lg p-4 bg-paper">
                    {/* Spam honeypot for Web3Forms */}
                    <input type="checkbox" className="hidden" style={{ display: "none" }} {...register("botcheck")} />

                    {fields.map((field) => (
                        <FormField key={field.name} field={field} register={register} error={errors[field.name]} />
                    ))}

                    <div className="flex gap-2 mt-6">
                        <Button variant="solid" onClick={close} className="p-2.5 justify-center">
                            <XMarkIcon className="size-5" />
                        </Button>

                        <Button variant="solid" type="submit" className="w-full justify-center font-light text-sm uppercase">
                            {isSubmitting ? (
                                <svg className="w-5 h-5 mx-auto text-paper animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                submitLabel
                            )}
                        </Button>
                    </div>
                </form>
            )}

            {isSubmitSuccessful && isSuccess && (
                <div className="flex items-center gap-4 bg-ink text-paper px-8 py-6">
                    <Button variant="light" onClick={close} className="p-2 text-ink">
                        <XMarkIcon className="size-5" />
                    </Button>
                    <p className="text-lg font-light">{successMessage}</p>
                </div>
            )}

            {isSubmitSuccessful && !isSuccess && (
                <div className="flex items-center gap-4 bg-error-strong text-paper px-8 py-6">
                    <Button variant="light" onClick={close} className="p-2 text-error-strong">
                        <XMarkIcon className="size-5" />
                    </Button>
                    <p className="text-lg font-light">Noget gik galt. Prøv igen eller send os en mail.</p>
                </div>
            )}
        </div>
    );
}
