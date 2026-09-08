import re

file_path = r'd:\RAJUAN-PERSONAL\VSCODE\victora\victory-fitness-app\app\(tabs)\workout.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

mapping = {
    # Titles & Heroes
    "heroTitle": "Fonts.display",
    "emptyHeroTitle": "Fonts.display",
    "popularTitleVertical": "Fonts.display",
    "savedPlanTitle": "Fonts.display",
    "pinnedCardTitle": "Fonts.display",
    "pinnedEmptyTitle": "Fonts.display",

    # Headings & Buttons & Badges
    "heroBadgeText": "Fonts.heading",
    "heroStartButtonText": "Fonts.heading",
    "sectionTitle": "Fonts.heading",
    "categoryPillText": "Fonts.heading",
    "sectionTitleMain": "Fonts.heading",
    "popularLevelBadgeText": "Fonts.heading",
    "popularMetaTag": "Fonts.heading",
    "sectionTitleSavedPlan": "Fonts.heading",
    "savedPlanEyebrow": "Fonts.heading",
    "pinnedBadgeText": "Fonts.heading",
    "pinnedDayTag": "Fonts.heading",
    "pinnedReplanText": "Fonts.heading",
    "pinnedCardCategory": "Fonts.heading",
    "pinnedMetricLabel": "Fonts.heading",
    "pinnedActionBtnText": "Fonts.heading",
    "pinnedCreateBtnText": "Fonts.heading",
    "sectionTitleHistory": "Fonts.heading",
    "seedBtnText": "Fonts.heading",
    "historyItemTitle": "Fonts.heading",
    "historyBadgeText": "Fonts.heading",
    "pageBtnText": "Fonts.heading",

    # Data / Metrics / Numbers
    "heroDurationText": "Fonts.dataBold",
    "popularMetaDuration": "Fonts.dataBold",
    "savedPlanProgressPercent": "Fonts.dataBold",
    "pinnedDurationText": "Fonts.dataBold",
    "pinnedMetricVal": "Fonts.dataBold",
    "historyDurationText": "Fonts.data",
    "pageInfoText": "Fonts.data",

    # Body & Notes
    "searchInput": "Fonts.body",
    "errorText": "Fonts.bodyMedium",
    "loadingText": "Fonts.bodyMedium",
    "heroMeta": "Fonts.bodyMedium",
    "emptyHeroText": "Fonts.body",
    "inlineEmptyStateText": "Fonts.body",
    "savedPlanDescription": "Fonts.body",
    "savedPlanProgressText": "Fonts.bodyMedium",
    "historySubtitle": "Fonts.body",
    "historyEmptyText": "Fonts.bodyMedium",
}

for style_name, font_val in mapping.items():
    pattern = rf'({style_name}:\s*\{{[^}}]*?fontFamily:\s*)([\'"][^\'"]+[\'"])'
    text = re.sub(pattern, rf'\g<1>{font_val}', text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Applied {len(mapping)} typography rules to app/(tabs)/workout.tsx!")
