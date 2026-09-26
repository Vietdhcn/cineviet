package vn.cineviet.payment;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** MoMo Collection Link v2 signature grammar. This class does not accept or settle payments. */
public final class MomoSignature {
    private static final String CREATE_FIELDS = "accessKey,amount,extraData,ipnUrl,orderId,orderInfo,partnerCode,redirectUrl,requestId,requestType";
    private static final String NOTIFICATION_FIELDS = "accessKey,amount,extraData,message,orderId,orderInfo,orderType,partnerCode,payType,requestId,responseTime,resultCode,transId";
    private final String accessKey;
    private final String secretKey;

    public MomoSignature(String accessKey, String secretKey) {
        if (accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank())
            throw new IllegalArgumentException("MoMo access key and secret key are required");
        this.accessKey = accessKey;
        this.secretKey = secretKey;
    }

    public String signCreate(Map<String, ?> fields) {
        return hmac(canonical(CREATE_FIELDS, fields));
    }

    public boolean verifyNotification(Map<String, ?> notification, String expectedPartnerCode, String expectedOrderId, long expectedAmount) {
        if (expectedPartnerCode == null || expectedOrderId == null || expectedAmount < 0) return false;
        if (!expectedPartnerCode.equals(value(notification, "partnerCode")) ||
            !expectedOrderId.equals(value(notification, "orderId")) ||
            !Long.toString(expectedAmount).equals(value(notification, "amount"))) return false;
        var received = value(notification, "signature");
        if (received == null || !received.matches("[0-9a-fA-F]{64}")) return false;
        try {
            var expected = HexFormat.of().parseHex(hmac(canonical(NOTIFICATION_FIELDS, notification)));
            var supplied = HexFormat.of().parseHex(received);
            return MessageDigest.isEqual(expected, supplied);
        } catch (IllegalArgumentException error) {
            return false;
        }
    }

    /** Authorization (resultCode=9000) must not issue a ticket; only a verified capture may do so. */
    public boolean verifyCapturedNotification(Map<String, ?> notification, String expectedPartnerCode, String expectedOrderId, long expectedAmount) {
        return verifyNotification(notification, expectedPartnerCode, expectedOrderId, expectedAmount) &&
            "0".equals(value(notification, "resultCode"));
    }

    private String canonical(String names, Map<String, ?> fields) {
        var result = new StringBuilder();
        for (var name : names.split(",")) {
            if (!result.isEmpty()) result.append('&');
            var fieldValue = "accessKey".equals(name) ? accessKey : value(fields, name);
            if (fieldValue == null) throw new IllegalArgumentException("Missing MoMo signature field: " + name);
            result.append(name).append('=').append(fieldValue);
        }
        return result.toString();
    }

    private String hmac(String value) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException("MoMo HMAC-SHA256 unavailable", error);
        }
    }

    private static String value(Map<String, ?> fields, String name) {
        if (fields == null) return null;
        var value = fields.get(name);
        return value == null ? null : value.toString();
    }
}
