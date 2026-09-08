import re

# 1. Update app/challenges/[challengeId].tsx
detail_file = r'd:\RAJUAN-PERSONAL\VSCODE\victora\victory-fitness-app\app\challenges\[challengeId].tsx'

with open(detail_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Add Fonts import if not present
if "from '../../constants/Typography'" not in text:
    text = text.replace(
        "import { Colors } from '../../constants/Colors';",
        "import { Colors } from '../../constants/Colors';\nimport { Fonts } from '../../constants/Typography';"
    )

mapping_detail = {
    "confirmModalTitle": "Fonts.display",
    "headerTitle": "Fonts.display",
    "heroTitle": "Fonts.display",
    "dayStripTitle": "Fonts.display",
    "overviewTitle": "Fonts.display",
    "trackerTitle": "Fonts.display",
    "sectionTitle": "Fonts.display",
    "hubTitle": "Fonts.display",
    "participantAvatarText": "Fonts.display",
    "emptyMessagesTitle": "Fonts.display",

    "confirmModalSecondaryText": "Fonts.heading",
    "confirmModalPrimaryText": "Fonts.heading",
    "backText": "Fonts.heading",
    "whyItMattersTitle": "Fonts.heading",
    "dayChipText": "Fonts.heading",
    "overviewEyebrow": "Fonts.heading",
    "trackerPillText": "Fonts.heading",
    "trackerStatLabel": "Fonts.heading",
    "legendText": "Fonts.heading",
    "primaryButtonText": "Fonts.heading",
    "secondaryButtonText": "Fonts.heading",
    "messageAuthor": "Fonts.heading",
    "inviteFriendDetailBtnText": "Fonts.heading",

    "trackerStatValue": "Fonts.dataBold",
    "pointsText": "Fonts.dataBold",
    "messageTime": "Fonts.data",

    "confirmModalText": "Fonts.body",
    "heroDescription": "Fonts.body",
    "whyItMattersBody": "Fonts.body",
    "dayStripSubtitle": "Fonts.body",
    "emptyPlanStateText": "Fonts.bodyMedium",
    "overviewBody": "Fonts.bodyMedium",
    "overviewSubtle": "Fonts.body",
    "trackerSubtitle": "Fonts.body",
    "participantName": "Fonts.bodyMedium",
    "emptyHelper": "Fonts.body",
    "messageBody": "Fonts.body",
    "emptyMessagesText": "Fonts.body",
    "input": "Fonts.body",
}

for style_name, font_val in mapping_detail.items():
    # Replace pattern: style_name: { ... fontFamily: '...' ... }
    pattern = rf'({style_name}:\s*\{{[^}}]*?fontFamily:\s*)([\'"][^\'"]+[\'"])'
    text = re.sub(pattern, rf'\g<1>{font_val}', text)

with open(detail_file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated [challengeId].tsx successfully!")


# 2. Update app/challenges/progress/[challengeId].tsx
progress_file = r'd:\RAJUAN-PERSONAL\VSCODE\victora\victory-fitness-app\app\challenges\progress\[challengeId].tsx'

with open(progress_file, 'r', encoding='utf-8') as f:
    ptext = f.read()

# Add Fonts import if not present
if "from '../../../constants/Typography'" not in ptext:
    ptext = ptext.replace(
        "import { Colors } from '../../../constants/Colors';",
        "import { Colors } from '../../../constants/Colors';\nimport { Fonts } from '../../../constants/Typography';"
    )

mapping_progress = {
    "confirmModalTitle": "Fonts.display",
    "headerTitle": "Fonts.display",
    "dayTitle": "Fonts.display",
    "sectionTitle": "Fonts.display",
    "celebrationTitle": "Fonts.display",
    "newPostcardTitle": "Fonts.display",
    "newPostcardBrandText": "Fonts.display",

    "confirmModalSecondaryText": "Fonts.heading",
    "confirmModalPrimaryText": "Fonts.heading",
    "heroMeta": "Fonts.heading",
    "chatShortcutText": "Fonts.heading",
    "pageCardActionsTitle": "Fonts.heading",
    "legendTitle": "Fonts.heading",
    "emptyPlanNoticeTitle": "Fonts.heading",
    "dayMissedLabel": "Fonts.heading",
    "dayCurrentLabel": "Fonts.heading",
    "urgencyPillText": "Fonts.heading",
    "compactButtonText": "Fonts.heading",
    "readOnlyBadgeText": "Fonts.heading",
    "exerciseCheckText": "Fonts.heading",
    "exerciseName": "Fonts.heading",
    "videoButtonText": "Fonts.heading",
    "dayDoneButtonText": "Fonts.heading",
    "celebrationEyebrow": "Fonts.heading",
    "newPostcardLabel": "Fonts.heading",
    "newPostcardExerciseText": "Fonts.heading",
    "newPostcardMetricLabel": "Fonts.heading",
    "newPostcardUserPillText": "Fonts.heading",
    "newPostcardUrl": "Fonts.heading",
    "shareCommunityBtnText": "Fonts.heading",
    "postcardShareLabel": "Fonts.heading",
    "celebrationPrimaryText": "Fonts.heading",
    "celebrationSecondaryText": "Fonts.heading",
    "cardActionText": "Fonts.heading",
    "celebrationCloseText": "Fonts.heading",

    "dayNumberText": "Fonts.dataBold",
    "dayPointsText": "Fonts.dataBold",
    "sectionPointsText": "Fonts.dataBold",
    "exercisePoints": "Fonts.dataBold",
    "newPostcardMetricValue": "Fonts.dataBold",
    "newPostcardMetricValueGut": "Fonts.dataBold",

    "confirmModalText": "Fonts.body",
    "headerMeta": "Fonts.body",
    "heroDescription": "Fonts.body",
    "statusNoticeText": "Fonts.body",
    "legendText": "Fonts.body",
    "emptyPlanNoticeText": "Fonts.body",
    "dayFocus": "Fonts.body",
    "dayMetaText": "Fonts.body",
    "dayNotes": "Fonts.body",
    "helperText": "Fonts.bodyMedium",
    "sectionDescription": "Fonts.body",
    "sectionMetaText": "Fonts.body",
    "exerciseDetails": "Fonts.body",
    "exerciseNotes": "Fonts.body",
    "readOnlyNoticeInlineText": "Fonts.bodyMedium",
    "celebrationText": "Fonts.body",
}

for style_name, font_val in mapping_progress.items():
    pattern = rf'({style_name}:\s*\{{[^}}]*?fontFamily:\s*)([\'"][^\'"]+[\'"])'
    ptext = re.sub(pattern, rf'\g<1>{font_val}', ptext)

with open(progress_file, 'w', encoding='utf-8') as f:
    f.write(ptext)

print("Updated progress/[challengeId].tsx successfully!")
