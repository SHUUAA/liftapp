
export const formatSupabaseError = (error: any): { message: string; isNetworkError: boolean } => {
    let message = "An unknown error occurred.";
    let isNetworkError = false;
    let rawErrorMessage = "";

    if (typeof error === 'object' && error !== null) {
        // Start with the main message, ensuring it's a string.
        rawErrorMessage = String(error.message || 'The operation failed for an unknown reason.');
        message = rawErrorMessage;

        // Safely append details, only if they exist and are strings.
        if (error.details && typeof error.details === 'string') {
            message += `\n\nDetails: ${error.details}`;
        }

        // Safely append hint, only if it exists and is a string.
        if (error.hint && typeof error.hint === 'string' && !rawErrorMessage.toLowerCase().includes('failed to fetch')) {
            message += `\nHint: ${error.hint}`;
        }

    } else if (error) {
        rawErrorMessage = String(error);
        message = rawErrorMessage;
    }

    if (rawErrorMessage.toLowerCase().includes('failed to fetch')) {
        isNetworkError = true;
        const networkTroubleshooting = "\n\nThis 'Failed to fetch' error often indicates a network-level problem. Please check the following:\n1. Your internet connection.\n2. Any firewall, VPN, or proxy settings that might be blocking the request.\n3. Browser extensions (like ad-blockers or privacy tools) – try disabling them temporarily.\n4. Open your browser's Developer Tools (usually by pressing F12), go to the 'Network' tab, and look for failed requests (often highlighted in red). This might provide more specific clues (e.g., CORS errors, CSP violations, or failed OPTIONS preflight requests).";
        
        // Don't duplicate the troubleshooting steps if they're already in the message.
        if (!message.includes("network-level problem")) {
            message += networkTroubleshooting;
        }
    }
    
    // Return a fallback message if we somehow ended up with an empty one.
    if (!message.trim()) {
      message = "An unexpected error occurred. Please check the console for details.";
    }

    return { message, isNetworkError };
  };
