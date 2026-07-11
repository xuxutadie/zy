from pathlib import Path
import json
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
INDEX_HTML = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
APP_JS = (ROOT / "web" / "app.js").read_text(encoding="utf-8")
STYLES_CSS = (ROOT / "web" / "styles.css").read_text(encoding="utf-8")
SIMULATION_DATA = json.loads((ROOT / "web" / "data" / "2025-simulation.json").read_text(encoding="utf-8"))


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
        self.assertIn("styles.css?v=20260620-mobile-layout", INDEX_HTML)
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

    def test_education_news_can_refresh_without_full_page_reload(self) -> None:
        self.assertIn('id="refreshEducationNewsButton"', INDEX_HTML)
        self.assertIn("async function loadEducationNewsData()", APP_JS)
        self.assertIn("async function refreshEducationNewsData()", APP_JS)
        self.assertIn("renderEducationNews();", APP_JS)
        self.assertIn('document.querySelector("#refreshEducationNewsButton")?.addEventListener("click", refreshEducationNewsData);', APP_JS)

    def test_mobile_layout_turns_sidebar_into_top_navigation(self) -> None:
        mobile_match = re.search(r'@media \(max-width: 760px\)\s*\{[\s\S]*?/\* end mobile app layout \*/\s*\}', STYLES_CSS)

        self.assertIsNotNone(mobile_match)
        mobile_css = mobile_match.group(0)
        self.assertIn(".app-shell {", mobile_css)
        self.assertIn("display: block;", mobile_css)
        self.assertIn(".app-shell::before {", mobile_css)
        self.assertIn("display: none;", mobile_css)
        self.assertIn(".sidebar {", mobile_css)
        self.assertIn("position: sticky;", mobile_css)
        self.assertIn("width: 100%;", mobile_css)
        self.assertIn(".workspace {", mobile_css)
        self.assertIn("width: 100%;", mobile_css)
        self.assertIn(".nav {", mobile_css)
        self.assertIn("overflow-x: auto;", mobile_css)
        self.assertIn(".table-wrap", mobile_css)
        self.assertIn("-webkit-overflow-scrolling: touch;", mobile_css)

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

    def test_calculation_dialog_opens_for_registered_users_before_saving(self) -> None:
        start = APP_JS.index("function runCalculation(options = {})")
        end = APP_JS.index("function renderEmptyResults()", start)
        run_body = APP_JS[start:end]

        self.assertIn("if (shouldOpenDialog) showResultDialog();", run_body)
        self.assertIn("if (shouldOpenDialog) saveCalculatorSubmission(form, results);", run_body)
        self.assertLess(
            run_body.index("if (shouldOpenDialog) showResultDialog();"),
            run_body.index("if (shouldOpenDialog) saveCalculatorSubmission(form, results);"),
        )
        self.assertNotIn("isAdmin()", run_body)

    def test_calculator_has_school_admission_lookup(self) -> None:
        calculator_match = re.search(r'<section id="calculator"[\s\S]*?</section>', INDEX_HTML)

        self.assertIsNotNone(calculator_match)
        calculator_html = calculator_match.group(0)
        self.assertIn("指定学校录取数据查询", calculator_html)
        self.assertIn('id="calculatorSchoolLookupForm"', calculator_html)
        self.assertIn('id="calculatorSchoolLookupInput"', calculator_html)
        self.assertIn('id="calculatorSchoolLookupResult"', calculator_html)
        self.assertIn("function renderCalculatorSchoolOptions()", APP_JS)
        self.assertIn("function renderCalculatorSchoolLookup()", APP_JS)
        self.assertIn("function getSchoolLookupRows(keyword)", APP_JS)
        self.assertIn("当前区域可参考", APP_JS)
        self.assertIn("2025实际线", APP_JS)
        self.assertIn("2026各校实际录取线需等录取结束后形成", APP_JS)
        self.assertIn('document.querySelector("#calculatorSchoolLookupForm").addEventListener("submit"', APP_JS)
        self.assertIn(".school-lookup-panel", STYLES_CSS)
        self.assertIn(".school-lookup-data-grid", STYLES_CSS)

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

    def test_2025_admission_lines_include_official_minimum_region_ranks(self) -> None:
        schools = SIMULATION_DATA["schools"]
        self.assertEqual(sum(1 for row in schools if row.get("lineRank")), 153)

        guiyang_no1 = next(
            row
            for row in schools
            if row["school"] == "\u8d35\u9633\u5e02\u7b2c\u4e00\u4e2d\u5b66" and row["score"] == 678
        )
        self.assertEqual(guiyang_no1["rankRegion"], "\u4e09\u533a\u4e00\u5730")
        self.assertEqual(guiyang_no1["lineRank"], 1011)

        minzu_affiliated = next(
            row
            for row in schools
            if row["school"] == "\u4e2d\u592e\u6c11\u65cf\u5927\u5b66\u9644\u5c5e\u4e2d\u5b66\u8d35\u9633\u5b66\u6821"
            and row["score"] == 648
        )
        self.assertEqual(minzu_affiliated["rankRegion"], "\u5168\u5e02")
        self.assertEqual(minzu_affiliated["lineRank"], 5218)

        self.assertIn("function getOfficialLineRank(school)", APP_JS)
        self.assertIn("function getLineRankForSchool(school, region = \"\")", APP_JS)
        self.assertIn("const lineRankInfo = getLineRankForSchool(school, form.region);", APP_JS)

    def test_yali_high_school_name_is_not_misspelled(self) -> None:
        school_names = {row["school"] for row in SIMULATION_DATA["schools"]}
        self.assertNotIn("贵阳礼吉高级中学(贵阳市第九中学)", school_names)
        self.assertIn("贵阳雅礼高级中学(贵阳市第九中学)", school_names)

    def test_2026_control_lines_are_entered_and_rendered(self) -> None:
        lines_2026 = [row for row in SIMULATION_DATA["controlLines"] if row["year"] == 2026]

        self.assertEqual(len(lines_2026), 11)

        by_region = {row["region"]: row for row in lines_2026}
        self.assertEqual(by_region["\u4e09\u533a\u4e00\u5730"]["first"], 582)
        self.assertEqual(by_region["\u4e09\u533a\u4e00\u5730"]["second"], 508)
        self.assertEqual(by_region["\u8d35\u5b89\u65b0\u533a"]["first"], 537)
        self.assertEqual(by_region["\u8d35\u5b89\u65b0\u533a"]["second"], 482)

        third_batch = next(row for row in lines_2026 if row["note"] == "\u7b2c\u4e09\u6279\u6b21\u5168\u5e02\u7edf\u4e00\u63a7\u5236\u7ebf")
        self.assertEqual(third_batch["other"], "403")

        through_program = next(row for row in lines_2026 if row["note"] == "3+4\u4e2d\u804c\u6559\u80b2\u4e0e\u5e94\u7528\u672c\u79d1\u6559\u80b2\u8d2f\u901a\u73ed")
        self.assertEqual(through_program["other"], "476")

        self.assertIn("controlLines2026", APP_JS)
        self.assertIn("2026\u5f55\u53d6\u63a7\u5236\u7ebf", APP_JS)
        self.assertIn("renderControlLineRows(controlLines2026)", APP_JS)

        control_source = next(
            item for item in SIMULATION_DATA["dataSources"] if item["category"] == "2026\u63a7\u5236\u7ebf"
        )
        self.assertEqual(control_source["url"], "https://www.gyzkzx.cn/html/2026-07/10/content_939412.htm")
        self.assertIn("\u5b98\u65b9\u9875\u9762\u5df2\u590d\u6838", control_source["status"])
        self.assertNotIn("2026???", {item["category"] for item in SIMULATION_DATA["dataSources"]})

    def test_2026_control_lines_gate_volunteer_recommendations(self) -> None:
        self.assertIn("function getBatchControlLine(batch, region, school = null)", APP_JS)
        self.assertIn("function getControlLineForSchool(school, form)", APP_JS)
        self.assertIn("function applyControlLineGate(chance, controlLineInfo)", APP_JS)
        self.assertIn("const controlLineInfo = getControlLineForSchool(school, form);", APP_JS)
        self.assertIn("const gatedChance = applyControlLineGate(chance, controlLineInfo);", APP_JS)
        self.assertIn("controlLineInfo,", APP_JS)
        self.assertIn("\u672a\u8fbe2026\u6279\u6b21\u6295\u6863\u63a7\u5236\u7ebf", APP_JS)
        self.assertIn("2026\u6279\u6b21\u7ebf", APP_JS)
        self.assertIn("\u8fd9\u4e0d\u662f\u8be5\u68212026\u5f55\u53d6\u7ebf", APP_JS)

    def test_region_targeted_admission_types_are_filtered_by_selected_region(self) -> None:
        huaxi_targeted = [
            row
            for row in SIMULATION_DATA["schools"]
            if "\u9762\u5411\u82b1\u6eaa\u533a\u62db\u751f" in f"{row.get('batch', '')} {row.get('type', '')}"
        ]
        self.assertGreaterEqual(len(huaxi_targeted), 1)
        self.assertIn("function isAdmissionTypeAvailableForRegion(school, region)", APP_JS)
        self.assertIn("function getAdmissionTargetRegions(school)", APP_JS)
        self.assertIn("function getControlRegionForAdmission(school, region)", APP_JS)
        self.assertIn("云岩\") || value.includes(\"南明\") || value.includes(\"观山湖\") || value.includes(\"小河", APP_JS)
        self.assertIn("花溪区?", APP_JS)
        self.assertIn("面向(${admissionRegionPattern})招生", APP_JS)
        self.assertIn("(${admissionRegionPattern})统招生", APP_JS)
        self.assertIn("面向非本区", APP_JS)
        self.assertIn("面向三区一地", APP_JS)
        self.assertIn("if (admissionRegions.length) return admissionRegions.includes(targetRegion);", APP_JS)
        self.assertIn(".filter((school) => isAdmissionTypeAvailableForRegion(school, form.region))", APP_JS)

    def test_special_programs_are_kept_as_2025_reference_candidates(self) -> None:
        self.assertNotIn("function isComparableVolunteerReference(school)", APP_JS)
        self.assertNotIn(".filter(isComparableVolunteerReference)", APP_JS)
        self.assertNotIn("isComparableVolunteerReference(school) && text.includes(\"第一批次\")", APP_JS)
        self.assertIn("概率按2025各校实际录取线/最低位次作历史基准", INDEX_HTML)
        self.assertIn("特长生、国际项目班、中外合作和综合高中会纳入参考", INDEX_HTML)
        self.assertIn("2026各校实际录取线需录取结束后形成", INDEX_HTML)
        self.assertIn("app.js?v=20260711-result-dialog", INDEX_HTML)

    def test_2026_school_admission_lines_are_not_fabricated_before_admission(self) -> None:
        source = next(
            item for item in SIMULATION_DATA["dataSources"] if item["category"] == "2026\u5404\u6821\u5f55\u53d6\u7ebf"
        )
        inventory = next(
            item for item in SIMULATION_DATA["dataInventory"] if item["label"] == "2026\u5404\u6821\u5f55\u53d6\u7ebf"
        )

        self.assertEqual(source["url"], "https://www.gyzkzx.cn/html/2026-07/09/content_939401.htm")
        self.assertIn("7\u670817\u65e5\u81f37\u670824\u65e5", source["status"])
        self.assertEqual(inventory["count"], 0)
        self.assertIn("\u4e0d\u4f1a", inventory["detail"])
        self.assertIn("\u5b66\u6821\u5f55\u53d6\u7ed3\u679c\u53d1\u5e03\u540e\u518d\u63a5\u5165\u5404\u6821\u5b9e\u9645\u5f55\u53d6\u5206\u6570\u7ebf", APP_JS)

    def test_2026_score_distribution_is_entered_from_official_pdf(self) -> None:
        city_rows = SIMULATION_DATA["scoreDistribution2026"]
        region_rows = SIMULATION_DATA["regionScoreDistribution2026"]

        self.assertEqual(len(city_rows), 701)
        self.assertEqual(len(region_rows), 6309)

        self.assertEqual(city_rows[0], {
            "score": 700,
            "segment": "700\u53ca\u4ee5\u4e0a",
            "count": 103,
            "cumulative": 103,
            "percent": 0.14,
        })
        self.assertEqual(city_rows[-1], {
            "score": 0,
            "segment": "0",
            "count": 9,
            "cumulative": 71941,
            "percent": 99.93,
        })

        city_582 = next(row for row in city_rows if row["score"] == 582)
        city_508 = next(row for row in city_rows if row["score"] == 508)
        self.assertEqual(city_582["cumulative"], 22157)
        self.assertEqual(city_508["cumulative"], 37332)

        main_582 = next(
            row for row in region_rows if row["region"] == "\u4e09\u533a\u4e00\u5730" and row["score"] == 582
        )
        guian_508 = next(
            row for row in region_rows if row["region"] == "\u8d35\u5b89\u65b0\u533a" and row["score"] == 508
        )
        self.assertEqual(main_582["cumulative"], 14299)
        self.assertEqual(guian_508["cumulative"], 1235)

        source = next(
            item for item in SIMULATION_DATA["dataSources"] if item["category"] == "2026\u4e00\u5206\u4e00\u6bb5\u8868"
        )
        self.assertEqual(source["url"], "https://www.gyzkzx.cn/html/2026-07/10/content_939411.htm")
        self.assertIn("2026\u4e00\u5206\u4e00\u6bb5\u8868", SIMULATION_DATA["meta"]["generatedFrom"])

    def test_calculator_prefers_2026_score_distribution_for_rank_estimation(self) -> None:
        self.assertIn("function getActiveScoreDistribution()", APP_JS)
        self.assertIn("function getActiveRegionScoreDistribution(region)", APP_JS)
        self.assertIn("function getActiveScoreDistributionYear()", APP_JS)
        self.assertIn("state.data.scoreDistribution2026", APP_JS)
        self.assertIn("state.data.regionScoreDistribution2026", APP_JS)
        self.assertIn("getActiveScoreDistribution()", APP_JS)
        self.assertIn("getActiveRegionScoreDistribution(region)", APP_JS)
        self.assertIn("${distributionYear}\u5168\u5e02\u5206\u6570\u6bb5", APP_JS)
        self.assertIn("${scoreDistributionYear} \u5206\u6570\u6bb5", APP_JS)


if __name__ == "__main__":
    unittest.main()
