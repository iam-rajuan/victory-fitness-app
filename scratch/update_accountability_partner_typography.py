import re

file_path = r'd:\RAJUAN-PERSONAL\VSCODE\victora\victory-fitness-app\components\profile\AccountabilityPartnerCard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

mapping = {
    # Display
    "partnerInitials": "Fonts.display",
    "modalTitle": "Fonts.display",

    # Headings / Badges / Buttons
    "cardTitle": "Fonts.heading",
    "partnerName": "Fonts.heading",
    "trainedBadgeText": "Fonts.heading",
    "notTrainedBadgeText": "Fonts.heading",
    "nudgeBtnText": "Fonts.heading",
    "pendingTitle": "Fonts.heading",
    "cancelPendingText": "Fonts.heading",
    "primaryActionText": "Fonts.heading",
    "secondaryActionText": "Fonts.heading",

    # Data / Numbers
    "partnerStatText": "Fonts.data",
    "codeValue": "Fonts.dataBold",
    "codeInput": "Fonts.dataBold",

    # Body
    "loadingText": "Fonts.bodyMedium",
    "cardSubtitle": "Fonts.body",
    "partnerEmail": "Fonts.body",
    "statusSuccessText": "Fonts.bodyMedium",
    "statusWarningText": "Fonts.bodyMedium",
    "emptyPrompt": "Fonts.body",
    "modalInput": "Fonts.body",
}

for style_name, font_val in mapping.items():
    pattern = rf'({style_name}:\s*\{{[^}}]*?fontFamily:\s*)([\'"][^\'"]+[\'"])'
    text = re.sub(pattern, rf'\g<1>{font_val}', text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Applied {len(mapping)} typography rules to AccountabilityPartnerCard.tsx!")
