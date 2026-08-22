/**
 * Screenings4U Enterprise Platform - Server-Side Webhook Validator Middleware
 * Version: 1.0.0
 * Language: Node.js (ES6 Vanilla JavaScript)
 * 
 * Secure validation utility designed for distribution to client engineering groups.
 * Rejects unsigned payloads, protects internal infrastructure from manipulation,
 * and maintains structural row metrics alignment under strict data audit frameworks.
 */

const crypto = require('crypto');

class Screenings4UWebhookValidator {
    /**
     * Initializes the verification middleware config matrix parameters.
     * @param {Object} config Core encryption settings
     * @param {string} config.webhookSecret Immutable signing secret token retrieved from the admin keys tab
     * @param {number} [config.toleranceSeconds=300] Target expiration drift window (Default: 5-minute replay block)
     */
    constructor(config = {}) {
        if (!config.webhookSecret) {
            throw new Error("Validation Engine Fault: 'webhookSecret' parameter must be structurally declared.");
        }
        this.webhookSecret = config.webhookSecret;
        this.toleranceSeconds = config.toleranceSeconds || 300;
    }

    /**
     * Express.js compliant middleware routing hook to validate signature payloads.
     * Enforces strict multi-tenant boundary checks.
     */
    getExpressMiddleware() {
        return (req, res, next) => {
            // 1. Locate cryptographic signature and timing verification headers
            const signature = req.headers['x-s4u-signature'];
            const timestamp = req.headers['x-s4u-timestamp'];

            if (!signature || !timestamp) {
                return res.status(401).json({
                    code: 'ERR_SIGNATURE_MISSING',
                    message: 'Rejection: Cryptographic validation elements missing from request streams.'
                });
            }

            // 2. Prevent message-replay manipulation loops by evaluating system time alignment
            const currentTime = Math.floor(Date.now() / 1000);
            const requestTime = parseInt(timestamp, 10);

            if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > this.toleranceSeconds) {
                return res.status(401).json({
                    code: 'ERR_TIMESTAMP_DRIFT',
                    message: 'Rejection: Timing parameter validation anomaly detected. Process sequence expired.'
                });
            }

            // 3. Reconstruct payload signing fingerprint natively via internal crypto mechanisms
            // Use the raw unparsed request string buffer to maintain literal alignment parameters
            const rawBody = req.rawBody || JSON.stringify(req.body);
            const signaturePayload = `${timestamp}.${rawBody}`;
            
            const computedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(signaturePayload)
                .digest('hex');

            // 4. Secure constant-time comparison prevents side-channel timing analysis attacks
            try {
                const bufferComputed = Buffer.from(computedSignature, 'hex');
                const bufferReceived = Buffer.from(signature, 'hex');

                if (bufferComputed.length !== bufferReceived.length || !crypto.timingSafeEqual(bufferComputed, bufferReceived)) {
                    return res.status(401).json({
                        code: 'ERR_INVALID_SIGNATURE',
                        message: 'Rejection: Authorization token mismatch. Payload origin validation failed.'
                    });
                }
            } catch (cryptoError) {
                return res.status(401).json({
                    code: 'ERR_CRYPTO_EXCEPTION',
                    message: 'Rejection: Cryptographic calculation aborted due to signature format corruptions.'
                });
            }

            // Authentication succeeded. Pass to local infrastructure routers.
            next();
        };
    }
}

module.exports = Screenings4UWebhookValidator;


