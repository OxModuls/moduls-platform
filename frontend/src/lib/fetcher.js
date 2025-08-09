import config from "../shared/config";

export function makeUrl(pathname) {
    return `${config.apiUrl}${pathname}`;
}

export async function fetchUtil({
    url,
    surfix = "",
    method,
    body,
    formEncoded = false,
    auth = null,
    headers = {},
    credentials = "omit",
    opts = {},
}) {
    const options = {
        method,
        credentials,
        ...opts,
        headers: { ...headers }, // Start with provided headers
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
        if (formEncoded) {
            const form = new FormData();

            Object.entries(body).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    form.append(key, value);
                }
            });
            options.body = form;
        } else {
            options.body = JSON.stringify(body);
            options.headers["Content-Type"] = "application/json";
        }
    }

    if (auth) {
        options.headers["Authorization"] = `${auth.tokenType || auth.token_type || 'Bearer'} ${auth.accessToken || auth.access_token}`;
    }

    try {
        const response = await fetch(url + surfix, options);
        const json = await response.json();

        if (response.ok) {
            return {
                success: true,
                data: json,
                headers: response.headers,
            };
        }

        console.log("fetchUtil Error: ", json);

        return {
            success: false,
            errorMessage: json?.detail?.message || response.statusText,
            statusText: response.statusText,
            status: response.status,
            error: json,
            headers: response.headers,
        };
    } catch (err) {
        console.log("fetchUtil Exception: ", err.message);
        return {
            success: false,
            errorMessage: err.message,
            statusText: null,
            status: null,
        };
    }
}

export function createFetcher({
    url,
    method,
    body = null,
    surfix = "",
    auth = null,
    formEncoded = false,
    credentials = "omit",
}) {
    return async (params = null) => {

        // console.log("createFetcher params", params)
        const response = await fetchUtil({
            url: makeUrl(params?._url || url),
            method,
            body: body || params,
            surfix,
            auth,
            formEncoded,
            credentials,
        });

        if (response.success) {
            return response.data;
        }

        console.log("createFetcher Error: ", response.error);

        const errorMessage = extractErrorMessage(response);
        const action = response.headers?.get?.("X-ACTION") || null;

        throw {
            message: errorMessage,
            action,
            status: response.status,
            error: response.error
        };
    };
}

export function extractErrorMessage(res) {
    const msg = getErrMsg(res);

    if (typeof msg === "string") return msg;
    if (typeof msg === "object") return JSON.stringify(msg);
    return "An unknown error occurred";
}

export function getErrMsg(res) {
    if (typeof res === "string") return res;
    if (res instanceof Error) return res.message;

    const err = res?.error;
    if (typeof err === "object") {
        return err.detail || err.message || err.error;
    }

    return res.errorMessage || res.statusText || res;
}

export const fetcher = createFetcher;