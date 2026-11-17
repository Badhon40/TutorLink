import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";

interface SslcommerzCheckoutInput {
  tranId: string;
  amount: string;
  productName: string;

  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postcode: string;
    country: string;
  };

  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

interface SslcommerzSessionResponse {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
}

interface SslcommerzValidationResponse {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  card_type?: string;
  store_amount?: string;
  bank_tran_id?: string;
  currency?: string;
  error?: string;
}

const getBaseUrl = () => {
  return env.SSLCOMMERZ_IS_SANDBOX
    ? "https://sandbox.sslcommerz.com"
    : "https://securepay.sslcommerz.com";
};

export const initiateSslcommerzCheckout = async (
  input: SslcommerzCheckoutInput
) => {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/gwprocess/v4/api.php`;

  const formData = new URLSearchParams({
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,

    total_amount: input.amount,
    currency: "BDT",
    tran_id: input.tranId,

    product_name: input.productName,
    product_category: "Education",
    product_profile: "non-physical-goods",

    cus_name: input.customer.name,
    cus_email: input.customer.email,
    cus_phone: input.customer.phone,
    cus_add1: input.customer.address,
    cus_city: input.customer.city,
    cus_postcode: input.customer.postcode,
    cus_country: input.customer.country,

    shipping_method: "NO",
    num_of_item: "1",

    success_url: input.successUrl,
    fail_url: input.failUrl,
    cancel_url: input.cancelUrl,
    ipn_url: input.ipnUrl,
  });

  let response: globalThis.Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(
      502,
      "Could not connect to SSLCOMMERZ"
    );
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      "SSLCOMMERZ checkout request failed"
    );
  }

  let result: SslcommerzSessionResponse;

  try {
    result = await response.json() as SslcommerzSessionResponse;
  } catch {
    throw new ApiError(
      502,
      "Invalid response received from SSLCOMMERZ"
    );
  }

  if (
    result.status !== "SUCCESS" ||
    !result.GatewayPageURL ||
    !result.sessionkey
  ) {
    throw new ApiError(
      502,
      result.failedreason || "SSLCOMMERZ checkout initialization failed"
    );
  }

  let gatewayUrl: URL;

  try {
    gatewayUrl = new URL(result.GatewayPageURL);
  } catch {
    throw new ApiError(
      502,
      "Invalid checkout URL received from SSLCOMMERZ"
    );
  }

  if (
    gatewayUrl.protocol !== "https:" ||
    !gatewayUrl.hostname.endsWith("sslcommerz.com")
  ) {
    throw new ApiError(
      502,
      "Untrusted checkout URL received from SSLCOMMERZ"
    );
  }

  return {
    sessionKey: result.sessionkey,
    gatewayPageUrl: result.GatewayPageURL,
  };
};

// Validate transaction server-to-server (Section 3.7)
export const verifySslcommerzTransaction = async (valId: string) => {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
    valId
  )}&store_id=${encodeURIComponent(
    env.SSLCOMMERZ_STORE_ID
  )}&store_passwd=${encodeURIComponent(
    env.SSLCOMMERZ_STORE_PASSWORD
  )}&v=1&format=json`;

  let response: globalThis.Response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(502, "Could not reach SSLCOMMERZ validation server");
  }

  if (!response.ok) {
    throw new ApiError(502, "SSLCOMMERZ validation request failed");
  }

  const result = (await response.json()) as SslcommerzValidationResponse;

  const isValid =
    result.status === "VALID" || result.status === "VALIDATED";

  return {
    isValid,
    tranId: result.tran_id,
    amount: result.amount,
    currency: result.currency,
    cardType: result.card_type,
    bankTranId: result.bank_tran_id,
    raw: result,
  };
};
