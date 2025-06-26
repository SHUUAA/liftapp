export const formatSupabaseError = (error: any): { message: string; isNetworkError: boolean } => {
    let message = "An unknown error occurred.";
    let isNetworkError = false;
    let rawErrorMessage = "";

    if (typeof error === 'object' && error !== null) {
        rawErrorMessage = error.message || "";
        message = rawErrorMessage;
        if (error.details && error.details !== rawErrorMessage) message += ` Details: ${error.details}`;
        if (error.hint && !rawErrorMessage.toLowerCase().includes('failed to fetch')) {
            message += ` Hint: ${error.hint}`;
        }
    } else if (typeof error === 'string') {
        rawErrorMessage = error;
        message = rawErrorMessage;
    }

    if (rawErrorMessage.toLowerCase().includes('failed to fetch')) {
        isNetworkError = true;
        let networkTroubleshooting = "\n\nThis 'Failed to fetch' error often indicates a network-level problem. Please check the following:\n1. Your internet connection.\n2. Any firewall, VPN, or proxy settings that might be blocking the request.\n3. Browser extensions (like ad-blockers or privacy tools) – try disabling them temporarily.\n4. Open your browser's Developer Tools (usually by pressing F12), go to the 'Network' tab, and look for failed requests (often highlighted in red). This might provide more specific clues (e.g., CORS errors, CSP violations, or failed OPTIONS preflight requests).";
        if (!message.endsWith(networkTroubleshooting)) { 
            message += networkTroubleshooting;
        }
    }
    return { message, isNetworkError };
  };
  