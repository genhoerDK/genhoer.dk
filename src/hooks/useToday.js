'use client';

import { useEffect, useState } from "react";

const BUILD_DATE = new Date(process.env.BUILD_DATE);

/**
 * Today's date for the visitor, so statuses ("Åbner om 3 dage", upcoming/opened)
 * stay correct between deploys. The first render uses the build date so it
 * matches the static HTML; right after load it switches to the visitor's date.
 * @returns {Date}
 */
export function useToday() {
    const [today, setToday] = useState(BUILD_DATE);

    useEffect(() => {
        setToday(new Date());
    }, []);

    return today;
}
