from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
INDEX_HTML = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
APP_JS = (ROOT / "web" / "app.js").read_text(encoding="utf-8")
STYLES_CSS = (ROOT / "web" / "styles.css").read_text(encoding="utf-8")


class HomepageContractTests(unittest.TestCase):
    def test_home_section_is_default_visible_page(self) -> None:
        home_match = re.search(r'<section id="home"[^>]*data-route[^>]*>', INDEX_HTML)
        calculator_match = re.search(r'<section id="calculator"[^>]*data-route[^>]*>', INDEX_HTML)

        self.assertIsNotNone(home_match)
        self.assertIsNotNone(calculator_match)
        self.assertNotIn("hidden", home_match.group(0))
        self.assertIn("hidden", calculator_match.group(0))

    def test_login_register_and_restored_session_enter_home_page(self) -> None:
        self.assertIn("function enterHomeAfterAuth()", APP_JS)
        self.assertEqual(APP_JS.count("enterHomeAfterAuth();"), 3)

    def test_auth_startup_forces_home_instead_of_requested_url(self) -> None:
        self.assertIn("async function startApp(initialPage = getRequestedPage())", APP_JS)
        self.assertIn("function initNavigation(initialPage = getRequestedPage())", APP_JS)
        self.assertIn("setActivePage(initialPage, { replace: true });", APP_JS)
        self.assertEqual(APP_JS.count("await startApp(HOME_PAGE_ID);"), 3)
        self.assertNotIn("await startApp();", APP_JS)

    def test_home_hero_uses_site_overview_and_landscape_image(self) -> None:
        self.assertIn("整合中考志愿模拟、学校信息查询、录取数据参考、教育资讯、培训机构、赛事解读和互助社区", APP_JS)
        self.assertIn('url("./assets/generated/education-hero-wide.png") center / cover no-repeat', STYLES_CSS)

    def test_home_cards_use_single_page_navigation(self) -> None:
        for page in ("calculator", "school-info", "education-news", "help-community"):
            self.assertRegex(
                INDEX_HTML,
                rf'<a class="home-card home-link-card home-card-[a-z]+" href="\?page={page}" data-page="{page}">',
            )
        self.assertIn('document.querySelectorAll(\'a[data-page]\')', APP_JS)
        self.assertIn("互帮互助", INDEX_HTML)

    def test_home_sidebar_does_not_expand_first_group_by_default(self) -> None:
        self.assertRegex(
            INDEX_HTML,
            r'<div class="nav-group" data-collapsed="true">\s*<div class="nav-group-head">\s*<a class="nav-primary" href="\?page=calculator"[^>]*aria-expanded="false"',
        )
        self.assertIn('group.dataset.collapsed = hasActiveChild ? "false" : "true";', APP_JS)

    def test_active_sidebar_buttons_have_distinct_color(self) -> None:
        self.assertIn("styles.css?v=20260620-content-heroes", INDEX_HTML)
        self.assertIn(".brand.active {", STYLES_CSS)
        self.assertIn(".nav a.active {", STYLES_CSS)
        self.assertIn(".subnav a.active {", STYLES_CSS)
        self.assertIn("background: linear-gradient(135deg, #1e40af, #2563eb);", STYLES_CSS)
        self.assertIn("color: #ffffff;", STYLES_CSS)

    def test_calculator_uses_dedicated_exam_hero_image(self) -> None:
        exam_hero_match = re.search(r'\.topbar\[data-hero="exam"\]\s*\{[\s\S]*?\n\}', STYLES_CSS)
        home_hero_match = re.search(r'\.topbar\[data-hero="home"\]\s*\{[\s\S]*?\n\}', STYLES_CSS)

        self.assertIsNotNone(exam_hero_match)
        self.assertIsNotNone(home_hero_match)
        self.assertIn('url("./assets/generated/exam-simulator-hero-v2.png") center right / cover no-repeat', exam_hero_match.group(0))
        self.assertNotIn("education-hero-wide.png", exam_hero_match.group(0))
        self.assertIn("education-hero-wide.png", home_hero_match.group(0))
        self.assertIn('const examPageIds = ["calculator", "dashboard", "schools"];', APP_JS)
        self.assertIn("examPageIds.includes(page)", APP_JS)

    def test_exam_child_pages_keep_primary_button_and_hero_unified(self) -> None:
        self.assertIn("const navPageGroups = {", APP_JS)
        self.assertIn('dashboard: "calculator"', APP_JS)
        self.assertIn('schools: "calculator"', APP_JS)
        self.assertIn("const activeNavPage = navPageGroups[activePage] || activePage;", APP_JS)
        self.assertIn("link.dataset.page === activeNavPage || link.dataset.page === activePage", APP_JS)

    def test_school_info_primary_navigation_opens_overview_not_high_school(self) -> None:
        self.assertIn('const SCHOOL_INFO_PAGE_ID = "school-info";', APP_JS)
        self.assertIn("SCHOOL_INFO_PAGE_ID,", APP_JS)
        self.assertRegex(
            INDEX_HTML,
            r'<a class="nav-primary" href="\?page=school-info" data-page="school-info"[^>]*>学校信息查询</a>',
        )
        self.assertNotIn('class="nav-primary" href="?page=high-schools" data-page="high-schools" data-short="学校"', INDEX_HTML)
        self.assertIn('<section id="school-info" class="section panel school-info-overview-page" data-route hidden>', INDEX_HTML)
        for page in ("primary-schools", "junior-schools", "high-schools"):
            self.assertRegex(INDEX_HTML, rf'href="\?page={page}" data-page="{page}"')

    def test_school_info_uses_dedicated_school_hero_image(self) -> None:
        school_hero_match = re.search(r'\.topbar\[data-hero="school"\]\s*\{[\s\S]*?\n\}', STYLES_CSS)

        self.assertIsNotNone(school_hero_match)
        self.assertIn('url("./assets/generated/school-info-hero-v2.png") center right / cover no-repeat', school_hero_match.group(0))
        self.assertNotIn("education-hero-wide.png", school_hero_match.group(0))
        self.assertNotIn("rgba(13, 148, 136", school_hero_match.group(0))
        self.assertIn("mode: \"school\"", APP_JS)
        self.assertIn("schoolInfoPageIds.includes(page)", APP_JS)

    def test_content_pages_use_dedicated_topic_hero_images(self) -> None:
        expected_heroes = {
            "education-news": "education-news-hero-v1.png",
            "training": "training-recommendations-hero-v1.png",
            "competition": "competition-insights-hero-v1.png",
            "help": "help-community-hero-v1.png",
        }

        self.assertIn("const contentHeroPagePresetMap = {", APP_JS)
        self.assertIn('"education-news": "educationNews"', APP_JS)
        self.assertIn('"training-recommendations": "training"', APP_JS)
        self.assertIn('"competition-insights": "competition"', APP_JS)
        self.assertIn('"help-community": "help"', APP_JS)
        self.assertIn("heroPresets[contentHeroPagePresetMap[page]]", APP_JS)
        for mode, asset in expected_heroes.items():
            hero_match = re.search(rf'\.topbar\[data-hero="{mode}"\]\s*\{{[\s\S]*?\n\}}', STYLES_CSS)

            self.assertIsNotNone(hero_match)
            self.assertIn(f'url("./assets/generated/{asset}") center right / cover no-repeat', hero_match.group(0))
            self.assertNotIn("education-hero-wide.png", hero_match.group(0))
            self.assertNotIn("exam-simulator-hero", hero_match.group(0))
            self.assertNotIn("school-info-hero", hero_match.group(0))

    def test_home_cards_have_distinct_color_accents(self) -> None:
        for tone in ("exam", "school", "content", "help"):
            self.assertIn(f".home-card-{tone}", STYLES_CSS)
            self.assertIn(f'home-card home-link-card home-card-{tone}', INDEX_HTML)

    def test_exam_primary_navigation_is_not_a_collapse_toggle(self) -> None:
        self.assertRegex(
            INDEX_HTML,
            r'<a class="nav-primary" href="\?page=calculator" data-page="calculator"[^>]*>中考志愿模拟</a>',
        )
        self.assertNotIn("nextGroupCollapsed", APP_JS)
        self.assertNotIn("group.dataset.collapsed = nextGroupCollapsed", APP_JS)

    def test_calculator_opens_directly_without_quota_review_panel(self) -> None:
        calculator_match = re.search(r'<section id="calculator"[\s\S]*?</section>', INDEX_HTML)

        self.assertIsNotNone(calculator_match)
        self.assertNotIn("calculatorQuotaReview", calculator_match.group(0))
        self.assertIn('id="calcForm"', calculator_match.group(0))
        self.assertNotIn("function renderCalculatorQuotaReview()", APP_JS)
        self.assertNotIn("renderCalculatorQuotaReview();", APP_JS)

    def test_quota_allocation_indicators_live_on_dashboard_page(self) -> None:
        dashboard_match = re.search(r'<section id="dashboard"[\s\S]*?</section>', INDEX_HTML)

        self.assertIsNotNone(dashboard_match)
        self.assertIn('id="currentYearData"', dashboard_match.group(0))
        self.assertIn("2026配额分配指标", APP_JS)
        self.assertIn("renderQuotaDetailTable(quotaRecords, highSchools, recordsStatus)", APP_JS)

    def test_data_management_page_is_removed_from_navigation_and_routes(self) -> None:
        self.assertNotIn('data-page="data"', INDEX_HTML)
        self.assertNotIn('id="data"', INDEX_HTML)
        self.assertNotIn('"data",', APP_JS)


if __name__ == "__main__":
    unittest.main()
