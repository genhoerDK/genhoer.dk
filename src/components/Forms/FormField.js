// One labelled input or textarea, registered with react-hook-form.
// Field options: see the fields arrays in ContactForm.js and MembershipForm.js

export default function FormField({ field, register, error }) {
    const { id, name, label, type = "text", multiline = false, rules, inputProps } = field;
    const borderClass = error ? "border-error focus:border-error" : "border-muted focus:border-ink";

    return (
        <div className="mb-4">
            <label htmlFor={id} className="text-xs uppercase">{label}</label>
            {multiline
                ? <textarea id={id} placeholder="" className={`w-full min-h-32 px-3 py-2 border-2 outline-none resize-none ${borderClass}`} {...register(name, rules)} />
                : <input id={id} type={type} placeholder="" autoComplete="false" className={`w-full px-3 py-2 border-2 outline-none ${borderClass}`} {...inputProps} {...register(name, rules)} />
            }
        </div>
    );
}
