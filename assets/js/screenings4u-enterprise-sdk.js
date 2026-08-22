/**
 * Screenings4U Enterprise Platform - Client Integrations SDK
 * Version: 1.0.0 (Core Production Release)
 * Language: ES6 Vanilla JavaScript (Zero External Dependencies)
 * 
 * Secure architecture module designed for distribution to corporate engineering teams 
 * connecting internal ATS, HRIS, and fleet tracking layers to compliance networks.
 */

class Screenings4UClient {
    /**
     * Instantiates the corporate infrastructure connection client wrapper.
     * @param {Object} config Core network configuration settings
     * @param {string} config.secretToken Crypto bearer token issued in admin developer settings
     * @param {string} config.organizationId Unique enterprise multi-tenant tenant UUID string
     * @param {string} [config.environment='production'] Target network gateway routing state ('sandbox' or 'production')
     */
    constructor(config = {}) {
        if (!config.secretToken) throw new Error("Initialization aborted: 'secretToken' token missing.");
        if (!config.organizationId) throw new Error("Initialization aborted: 'organizationId' parameter missing.");

        this.secretToken = config.secretToken;
        this.organizationId = config.organizationId;
        
        // Match base domain routes directly with official endpoint arrays
        this.baseUrl = config.environment === 'sandbox' 
            ? 'https://screenings4u.enterprise'
            : 'https://screenings4u.enterprise';
    }

    /**
     * Abstract request router running structural header mappings
     * @private
     */
    async _request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = {
            'Authorization': `Bearer ${this.secretToken}`,
            'X-Organization-ID': $this.organizationId,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            
            // Standard JSON footprint decoding
            let data = null;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            }

            if (!response.ok) {
                // Raise explicit API context parameters on database or structural failures
                const errorPayload = {
                    status: response.status,
                    code: data ? data.code : 'ERR_NETWORK_FAULT',
                    message: data ? data.message : `HTTP connection rejected with status code: ${response.status}`
                };
                return Promise.reject(errorPayload);
            }

            return data;
        } catch (fetchError) {
            return Promise.reject({
                status: 500,
                code: 'ERR_SDK_FETCH_EXCEPTION',
                message: fetchError.message || 'Outbound connection pipeline broke during transmission.'
            });
        }
    }

    /**
     * Workflow A: Push workforce directory modifications into the system register.
     * @param {Object} employeeData Structural worker parameter object
     * @param {string} employeeData.fullName First and last legal identify name
     * @param {string} employeeData.currentLocationId Associated geocoded location ledger code UUID
     * @param {string} employeeData.regulatoryProgram Compliance identifier ('DOT-FMCSA' or 'Non-DOT')
     * @param {string} [employeeData.cdlNumberString] Professional driver catalog indicator
     * @param {string} [employeeData.employmentStatus='Active'] Operating state classification
     */
    async createEmployee(employeeData = {}) {
        if (!employeeData.fullName) throw new Error("Validation failure: 'fullName' property required.");
        if (!employeeData.regulatoryProgram) throw new Error("Validation failure: 'regulatoryProgram' identifier required.");

        const payload = {
            organization_id: this.organizationId,
            current_location_id: employeeData.currentLocationId || null,
            full_name: employeeData.fullName,
            cdl_number_string: employeeData.cdlNumberString || null,
            employment_status: employeeData.employmentStatus || 'Active',
            regulatory_program: employeeData.regulatoryProgram
        };

        return this._request('/employees', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Workflow B: Dispatch an immediate testing order voucher request to clinical nodes.
     * @param {Object} orderData Operational screening configuration parameters
     * @param {string} orderData.employeeId Targeted worker file tracker UUID
     * @param {string} orderData.testingProgram System grouping track ('DOT' or 'Non-DOT')
     * @param {string} orderData.reason Draw categorization ('Pre-employment', 'Random', etc.)
     * @param {string} orderData.panelCode Standard substance cutoff layout matrix code
     */
    async createTestOrder(orderData = {}) {
        if (!orderData.employeeId) throw new Error("Validation failure: 'employeeId' parameter required.");
        if (!orderData.testingProgram) throw new Error("Validation failure: 'testingProgram' definition required.");
        if (!orderData.reason) throw new Error("Validation failure: 'reason' property tracking required.");
        if (!orderData.panelCode) throw new Error("Validation failure: 'panelCode' validation indicator required.");

        const payload = {
            organization_id: this.organizationId,
            employee_id: orderData.employeeId,
            testing_program: orderData.testingProgram,
            reason: orderData.reason,
            panel_code: orderData.panelCode
        };

        return this._request('/test_orders', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Query operational screening workflow states from active results caches.
     * @param {string} orderId Unique verification order index tracker UUID
     */
    async getOrderState(orderId) {
        if (!orderId) throw new Error("Validation failure: Targeted 'orderId' index missing.");
        
        return this._request(`/test_orders/${orderId}`, {
            method: 'GET'
        });
    }
}

// Ensure error-free script execution pathways inside alternate Node environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Screenings4UClient;
}
