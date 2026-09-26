"""Exercise the real customer account UI against a local PostgreSQL-backed stack."""

import os
import re
from playwright.sync_api import sync_playwright


ORIGIN = os.environ.get("CINEVIET_WEB_URL", "http://127.0.0.1:5173")
assert ORIGIN.startswith(("http://127.0.0.1:", "http://localhost:")), "Local UI test only"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        headless=True,
    )
    page = browser.new_page(viewport={"width": 1280, "height": 900}, locale="vi-VN")
    page.goto(f"{ORIGIN}/tai-khoan", wait_until="networkidle")
    page.get_by_role("heading", name="Tài khoản của bạn").wait_for()
    assert "thanh toán chưa khả dụng" in page.locator(".demo-ribbon").inner_text().lower()
    for width, height in ((390, 844), (375, 812), (844, 390)):
        page.set_viewport_size({"width": width, "height": height})
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Account form overflows {width}px"
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=os.path.join(os.environ["TEMP"], "cineviet-account-mobile.png"), full_page=True)
    page.set_viewport_size({"width": 1280, "height": 900})
    page.get_by_role("group", name="Chọn thao tác tài khoản").get_by_role("button", name="Tạo tài khoản").click()
    email = f"web-{os.urandom(8).hex()}@cineviet.local"
    password = "a strong web test passphrase"
    page.get_by_label("Email").fill(email)
    page.get_by_label("Mật khẩu").fill(password)
    page.locator("form").get_by_role("button", name="Tạo tài khoản").click()
    page.get_by_text("Đã đăng nhập", exact=False).wait_for()
    shows = page.request.get(f"{ORIGIN}/api/showtimes").json()
    page.goto(f"{ORIGIN}/dat-ghe/{shows[0]['id']}", wait_until="networkidle")
    page.get_by_role("heading", name="Chọn chỗ ngồi").wait_for()
    page.locator(".seat:not([disabled])").first.click()
    page.get_by_role("button", name=re.compile("Giữ ghế & tiếp tục")).click()
    page.get_by_role("heading", name="Xác nhận trước khi đèn tắt").wait_for()
    page.get_by_role("heading", name="Thanh toán chưa khả dụng").wait_for()
    assert page.get_by_role("button", name="Xác nhận mô phỏng").count() == 0
    page.get_by_role("button", name="Hủy giữ chỗ").click()
    page.wait_for_url(re.compile(r"/don-ve$"))
    page.get_by_role("heading", name="Đơn vé của tôi").wait_for()
    assert "phiên demo" not in page.locator(".page-title p").inner_text().lower()
    page.goto(f"{ORIGIN}/tai-khoan", wait_until="networkidle")
    page.get_by_role("button", name="Đăng xuất", exact=True).click()
    page.locator("form").get_by_role("button", name="Đăng nhập").wait_for()
    page.goto(f"{ORIGIN}/dat-ghe/{shows[0]['id']}", wait_until="networkidle")
    page.get_by_role("heading", name="Chọn chỗ ngồi").wait_for()
    page.locator(".seat:not([disabled])").first.click()
    page.get_by_role("button", name=re.compile("Giữ ghế & tiếp tục")).click()
    page.get_by_role("link", name="Đăng nhập để giữ ghế").click()
    page.get_by_label("Email").fill(email)
    page.get_by_label("Mật khẩu").fill(password)
    page.locator("form").get_by_role("button", name="Đăng nhập").click()
    page.wait_for_url(re.compile(r"/dat-ghe/"))
    page.goto(f"{ORIGIN}/tai-khoan", wait_until="networkidle")
    for width, height in ((390, 844), (375, 812), (844, 390)):
        page.set_viewport_size({"width": width, "height": height})
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Account security actions overflow {width}px"
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=os.path.join(os.environ["TEMP"], "cineviet-account-security-mobile.png"), full_page=True)
    page.set_viewport_size({"width": 1280, "height": 900})
    page.get_by_role("button", name="Đăng xuất mọi thiết bị").wait_for()
    page.once("dialog", lambda dialog: dialog.accept())
    page.get_by_role("button", name="Đăng xuất mọi thiết bị").click()
    page.get_by_role("status").get_by_text("Đã đăng xuất khỏi tất cả thiết bị.").wait_for()
    page.locator("form").get_by_role("button", name="Đăng nhập").wait_for()
    print("CUSTOMER_UI_OK: register, hold without demo payment, cancel, logout, login, return and logout everywhere")
    browser.close()
