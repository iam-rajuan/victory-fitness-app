import re

file_path = r'd:\RAJUAN-PERSONAL\VSCODE\victora\victory-fitness-app\app\(tabs)\mealPlan.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

mapping = {
    # Display / Heroes
    "bigQuestion": "Fonts.display",
    "wizardBrandTitle": "Fonts.display",
    "planBrandTitle": "Fonts.display",
    "planTitle": "Fonts.display",
    "quoteText": "Fonts.display",
    "modalTitle": "Fonts.display",
    "oneTapTitle": "Fonts.display",
    "analysisTitle": "Fonts.display",
    "analysisResultTitle": "Fonts.display",
    "slTitle": "Fonts.display",
    "webcamTitle": "Fonts.display",

    # Headings / Badges / Buttons
    "wizardBrandSub": "Fonts.heading",
    "optionLabel": "Fonts.heading",
    "genderOptionTextActive": "Fonts.heading",
    "jobStage": "Fonts.heading",
    "nextBtnText": "Fonts.heading",
    "addMealButtonText": "Fonts.heading",
    "summaryMealLabel": "Fonts.heading",
    "summaryStatusText": "Fonts.heading",
    "nextUpcomingBadgeText": "Fonts.heading",
    "nutrientTimingPillText": "Fonts.heading",
    "mealLabel": "Fonts.heading",
    "mealCompleteBadge": "Fonts.heading",
    "mealName": "Fonts.heading",
    "mealActionTitle": "Fonts.heading",
    "completeMealBtnText": "Fonts.heading",
    "modalEyebrow": "Fonts.heading",
    "modalMealName": "Fonts.heading",
    "modalMealSection": "Fonts.heading",
    "modalCompleteBtnText": "Fonts.heading",
    "sourcePickerOptionTitle": "Fonts.heading",
    "shoppingBtnText": "Fonts.heading",
    "regeneratePlanBtnText": "Fonts.heading",
    "editPrefsBtnText": "Fonts.heading",
    "newPlanBtnText": "Fonts.heading",
    "trackerSectionTitle": "Fonts.heading",
    "getSuggestionsBtnText": "Fonts.heading",
    "advicePanelEyebrow": "Fonts.heading",
    "advicePanelTitle": "Fonts.heading",
    "advicePanelPillText": "Fonts.heading",
    "adviceBulletText": "Fonts.heading",
    "mealSearchBtnText": "Fonts.heading",
    "analysisPreviewLabel": "Fonts.heading",
    "analysisResultLabel": "Fonts.heading",
    "analysisHistoryTitle": "Fonts.heading",
    "analysisHistoryRowTitle": "Fonts.heading",
    "analysisHistoryRowPillText": "Fonts.heading",
    "analysisUploadText": "Fonts.heading",
    "copyToastText": "Fonts.heading",
    "slCategoryHeader": "Fonts.heading",
    "slCopyBtnText": "Fonts.heading",
    "generateBtnText": "Fonts.heading",
    "analysisBtnText": "Fonts.heading",
    "analysisActionBtnText": "Fonts.heading",
    "webcamErrorText": "Fonts.heading",
    "dailyMetricLabel": "Fonts.heading",
    "summaryPillText": "Fonts.heading",

    # Data / Metrics / Numbers
    "totalsVal": "Fonts.dataBold",
    "dailyMetricValue": "Fonts.dataBold",
    "summaryValue": "Fonts.dataBold",
    "macroChipText": "Fonts.dataBold",
    "macroGridVal": "Fonts.dataBold",
    "analysisConfidenceText": "Fonts.dataBold",
    "analysisResultMetricValue": "Fonts.dataBold",
    "analysisHistoryCount": "Fonts.dataBold",
    "stepCounter": "Fonts.data",
    "dailyMetricSubtext": "Fonts.data",

    # Body
    "bigSub": "Fonts.body",
    "optionSub": "Fonts.body",
    "textInput": "Fonts.body",
    "fieldLabel": "Fonts.body",
    "genderOptionText": "Fonts.body",
    "loadingDetailText": "Fonts.body",
    "planLoadingText": "Fonts.body",
    "backBtnText": "Fonts.body",
    "planDesc": "Fonts.body",
    "trackerProgressText": "Fonts.body",
    "summaryLabel": "Fonts.body",
    "summaryMealName": "Fonts.bodyMedium",
    "mealDesc": "Fonts.body",
    "mealHintText": "Fonts.body",
    "mealActionSub": "Fonts.body",
    "mealActionSecondaryText": "Fonts.bodyMedium",
    "modalSubtitle": "Fonts.body",
    "modalMealDesc": "Fonts.body",
    "modalMealItem": "Fonts.body",
    "modalSecondaryActionText": "Fonts.bodyMedium",
    "modalCancelBtnText": "Fonts.bodyMedium",
    "sourcePickerOptionSub": "Fonts.body",
    "oneTapSub": "Fonts.body",
    "macroGridLabel": "Fonts.body",
    "macroGridUnit": "Fonts.body",
    "adviceItemText": "Fonts.bodyMedium",
    "adviceFallbackText": "Fonts.bodyMedium",
    "mealSearchInput": "Fonts.body",
    "todayLogsLabel": "Fonts.body",
    "todayLogsEmpty": "Fonts.body",
    "analysisDesc": "Fonts.body",
    "analysisPreviewText": "Fonts.bodyMedium",
    "analysisLoadingText": "Fonts.bodyMedium",
    "analysisResultSummary": "Fonts.body",
    "analysisResultMetricLabel": "Fonts.body",
    "analysisNoteItem": "Fonts.body",
    "analysisErrorText": "Fonts.bodyMedium",
    "analysisHistoryRowMeta": "Fonts.body",
    "analysisEmptyText": "Fonts.body",
    "analysisEmptySub": "Fonts.body",
    "slSubtitle": "Fonts.body",
    "slClearText": "Fonts.body",
    "slItemName": "Fonts.body",
    "slItemQty": "Fonts.body",
    "webcamGuideText": "Fonts.bodyMedium",
    "webcamErrorSub": "Fonts.body",
}

for style_name, font_val in mapping.items():
    pattern = rf'({style_name}:\s*\{{[^}}]*?fontFamily:\s*)([\'"][^\'"]+[\'"])'
    text = re.sub(pattern, rf'\g<1>{font_val}', text)

# Also handle jsonText: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
text = re.sub(r'jsonText:\s*\{[^}]*?fontFamily:\s*Platform\.OS\s*===\s*\'ios\'\s*\?\s*\'Menlo\'\s*:\s*\'monospace\'', 'jsonText: {\n    fontFamily: Fonts.data', text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Applied {len(mapping)} typography rules to app/(tabs)/mealPlan.tsx!")
