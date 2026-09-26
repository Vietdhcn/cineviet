package vn.cineviet.payment;

import static org.junit.jupiter.api.Assertions.*;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MomoSignatureTest {
    private final MomoSignature signer = new MomoSignature("access-demo", "secret-demo");

    @Test void requestSignatureRequiresAllCanonicalFields() {
        var request = Map.<String, Object>of(
            "amount", 85000, "extraData", "", "ipnUrl", "https://example.test/api/payments/momo/ipn",
            "orderId", "CV123", "orderInfo", "Ve CV123", "partnerCode", "PARTNER",
            "redirectUrl", "https://example.test/payments/return", "requestId", "REQUEST123", "requestType", "payWithMethod");
        var signature = signer.signCreate(request);
        assertEquals(64, signature.length());
        assertEquals(signature, signer.signCreate(request));
        assertThrows(IllegalArgumentException.class, () -> signer.signCreate(Map.of("amount", 85000)));
    }

    @Test void notificationRejectsTamperingOrWrongOrderAndDoesNotTreatAuthorizationAsCapture() {
        var notification = new HashMap<String, Object>();
        notification.put("amount", 85000);
        notification.put("extraData", "");
        notification.put("message", "Successful.");
        notification.put("orderId", "CV123");
        notification.put("orderInfo", "Ve CV123");
        notification.put("orderType", "momo_wallet");
        notification.put("partnerCode", "PARTNER");
        notification.put("payType", "qr");
        notification.put("requestId", "REQUEST123");
        notification.put("responseTime", 1721720663942L);
        notification.put("resultCode", 0);
        notification.put("transId", 4088878653L);
        notification.put("signature", signedNotification(notification));

        assertTrue(signer.verifyNotification(notification, "PARTNER", "CV123", 85000));
        assertTrue(signer.verifyCapturedNotification(notification, "PARTNER", "CV123", 85000));
        assertFalse(signer.verifyNotification(notification, "PARTNER", "OTHER", 85000));
        assertFalse(signer.verifyNotification(notification, "PARTNER", "CV123", 85001));
        notification.put("amount", 85001);
        assertFalse(signer.verifyNotification(notification, "PARTNER", "CV123", 85000));
        notification.put("amount", 85000);
        notification.put("resultCode", 9000);
        assertFalse(signer.verifyNotification(notification, "PARTNER", "CV123", 85000));
        assertFalse(signer.verifyCapturedNotification(notification, "PARTNER", "CV123", 85000));
        notification.remove("payType");
        assertFalse(signer.verifyNotification(notification, "PARTNER", "CV123", 85000));
    }

    // Independently construct the published canonical field order; do not call production private methods.
    private String signedNotification(Map<String, Object> values) {
        var canonical = "accessKey=access-demo&amount=" + values.get("amount") + "&extraData=" + values.get("extraData") +
            "&message=" + values.get("message") + "&orderId=" + values.get("orderId") + "&orderInfo=" + values.get("orderInfo") +
            "&orderType=" + values.get("orderType") + "&partnerCode=" + values.get("partnerCode") + "&payType=" + values.get("payType") +
            "&requestId=" + values.get("requestId") + "&responseTime=" + values.get("responseTime") +
            "&resultCode=" + values.get("resultCode") + "&transId=" + values.get("transId");
        try {
            var mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec("secret-demo".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            return java.util.HexFormat.of().formatHex(mac.doFinal(canonical.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception error) { throw new AssertionError(error); }
    }
}
