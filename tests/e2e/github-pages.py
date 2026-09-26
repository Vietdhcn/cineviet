"""Check the built static demo under a GitHub Pages-style project path."""

from playwright.sync_api import sync_playwright

ORIGIN = "http://127.0.0.1:4174/cineviet/"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        headless=True,
    )
    page = browser.new_page(viewport={"width": 1280, "height": 900}, locale="vi-VN")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(ORIGIN, wait_until="networkidle")
    assert page.get_by_role("heading", name="Bộ phim tiếp theo đang chờ bạn.").count() == 1, (
        f"URL={page.url}; body={page.locator('body').inner_text()[:500]}; errors={errors}"
    )
    assert "CHẾ ĐỘ DEMO" in page.locator(".demo-ribbon").inner_text().upper()
    assert page.locator(".hero__image").evaluate("image => image.complete && image.naturalWidth > 0")
    page.get_by_role("navigation", name="Điều hướng chính").get_by_role("link", name="Rạp chiếu").click()
    assert page.url == ORIGIN + "#/rap", page.url
    page.set_viewport_size({"width": 390, "height": 844})
    page.reload(wait_until="networkidle")
    page.get_by_role("heading", name="Tìm rạp. Chọn buổi chiếu.").wait_for()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    print("GITHUB_PAGES_BUILD_OK: demo label, hero asset, project subpath and reloadable route")
    browser.close()
