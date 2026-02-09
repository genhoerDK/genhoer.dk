"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import useWeb3Forms from "@web3forms/react";
import { XMarkIcon } from "@heroicons/react/20/solid";

export default function MembershipForm({ onClose }) {
    const { register, handleSubmit, reset, formState: { errors, isSubmitSuccessful, isSubmitting }, } = useForm({ mode: "onSubmit", });

    const [isSuccess, setIsSuccess] = useState(false);

    const apiKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "d3a3ed6e-3d70-4c5a-a0c4-84bd405cd459";

    const { submit: onSubmit } = useWeb3Forms({
        access_key: apiKey,
        settings: { from_name: "Genhør", subject: "Nyt medlemskab", },
        onSuccess: () => {
            setIsSuccess(true);
            reset();
        },
        onError: () => {
            setIsSuccess(false);
        },
    });

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
                    <input type="checkbox" id="" className="hidden" style={{ display: "none" }} {...register("botcheck")}></input>

                    <div className="mb-4">
                        <label className="text-xs uppercase">Fornavn</label>
                        <input
                            id="fname"
                            type="text"
                            placeholder=""
                            autoComplete="false"
                            className={`w-full px-3 py-2 border-2 outline-none  ${errors.fname ? "border-red-600 focus:border-red-600" : "border-muted focus:border-ink"}`}
                            {...register("fname", { required: "Udfyld venligst dit fornavn" })} />
                    </div>

                    <div className="mb-4">
                        <label className="text-xs uppercase">Efternavn</label>
                        <input
                            id="lname"
                            type="text"
                            placeholder=""
                            autoComplete="false"
                            className={`w-full px-3 py-2 border-2 outline-none  ${errors.lname ? "border-red-600 focus:border-red-600" : "border-muted focus:border-ink"}`}
                            {...register("lname", { required: "Udfyld venligst dit efternavn" })} />
                    </div>

                    <div className="mb-4">
                        <label className="text-xs uppercase">Fødselsdato</label>
                        <input
                            id="birthday"
                            type="text"
                            placeholder=""
                            autoComplete="false"
                            className={`w-full px-3 py-2 border-2 outline-none  ${errors.birthday ? "border-red-600 focus:border-red-600" : "border-muted focus:border-ink"}`}
                            {...register("birthday", { required: "Udfyld venligst din fødselsdato" })} />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="email_address" className="text-xs uppercase">E-mail</label>
                        <input
                            id="email_address"
                            type="email"
                            placeholder=""
                            name="email"
                            autoComplete="false"
                            className={`w-full px-3 py-2 border-2 outline-none  ${errors.email ? "border-red-600 focus:border-red-600" : "border-muted focus:border-ink"}`}
                            {...register("email", {
                                required: "Udfyld venligst din e-mailadresse",
                                pattern: {
                                    value: /^\S+@\S+$/i,
                                    message: "Indtast venligst en gyldig e-mailadresse",
                                },
                            })} />
                    </div>

                    <div className="mb-4">
                        <label className="text-xs uppercase">Telefon</label>
                        <input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={8}
                            placeholder=""
                            autoComplete="false"
                            className={`w-full px-3 py-2 border-2 outline-none  ${errors.phone ? "border-red-600 focus:border-red-600" : "border-muted focus:border-ink"}`}
                            {...register("phone", { required: "Udfyld venligst dit telefonnummer" })} />
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button type="button" onClick={close} className="p-2.5 flex justify-center items-center bg-ink text-paper cursor-pointer hover:bg-hard">
                            <XMarkIcon className="size-5" />
                        </button>

                        <button type="submit" className="w-full font-light text-sm uppercase text-paper bg-ink hover:bg-hard cursor-pointer">
                            {isSubmitting ? (
                                <svg className="w-5 h-5 mx-auto text-paper animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                "Bliv medlem"
                            )}
                        </button>
                    </div>
                </form>
            )}

            {isSubmitSuccessful && isSuccess && (
                <div className="flex items-center gap-4 bg-ink text-paper px-8 py-6">
                    <button type="button" onClick={close} className="p-2 cursor-pointer bg-paper text-ink rounded-full">
                        <XMarkIcon className="size-5" />
                    </button>
                    <p className="text-lg font-light">Tak for din tilmelding!</p>
                </div>
            )}

            {isSubmitSuccessful && !isSuccess && (
                <div className="flex items-center gap-4 bg-red-800 text-paper px-8 py-6">
                    <button type="button" onClick={close} className="p-2 cursor-pointer bg-paper text-red-800 rounded-full">
                        <XMarkIcon className="size-5" />
                    </button>
                    <p className="text-lg font-light">Noget gik galt. Prøv igen eller send os en mail.</p>
                </div>
            )}
        </div>
    );
}