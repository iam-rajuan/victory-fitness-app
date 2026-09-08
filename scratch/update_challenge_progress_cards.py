import re

filepath = r"d:\RAJUAN-PERSONAL\VSCODE\victora\victory-fitness-app\app\challenges\progress\[challengeId].tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the JSX in day list rendering
target_jsx = """            {hasConfiguredPlanDays ? (
              <View style={styles.dayList}>
                {thread.plan_days.map((day) => {
                const dayProgress = dayProgressMap.get(day.day_number);
                const isExpanded = Boolean(expandedDays[day.day_number]);
                const isCurrentDay = currentCalendarDay === day.day_number && !dayProgress?.completed;
                const isMissed = !dayProgress?.completed && !isCurrentDay && day.day_number < currentCalendarDay;
                const progressFraction = getDayProgressFraction(day, dayProgress);
                const dayPoints = getDayPoints(day, unitPointMap);
                const completedExerciseIds = Array.isArray(dayProgress?.completed_exercise_ids) ? dayProgress.completed_exercise_ids : [];
                const completedSectionIds = Array.isArray(dayProgress?.completed_section_ids) ? dayProgress.completed_section_ids : [];
                const dayExerciseCount = day.sections.flatMap((section) => section.exercises).length;
                const completedExerciseCount = day.sections.reduce((total, section) => {
                  if (completedSectionIds.includes(section.id)) {
                    return total + section.exercises.length;
                  }
                  return total + getSectionCompletedCount(section, completedExerciseIds);
                }, 0);
                const allSectionsCompleted = day.sections.every((section) => completedSectionIds.includes(section.id));

                  return (
                    <View key={`day-${day.day_number}`} style={[
                      styles.dayCard,
                      dayProgress?.completed && styles.dayCardCompleted,
                      isMissed && styles.dayCardMissed,
                    ]}>
                    <TouchableOpacity
                      style={styles.dayRow}
                      activeOpacity={0.88}
                      onPress={() => toggleDayExpanded(day.day_number)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View style={styles.dayLeft}>
                        <View style={[
                          styles.dayNumberBadge,
                          isCurrentDay && styles.dayNumberBadgeCurrent,
                          dayProgress?.completed && styles.dayNumberBadgeCompleted,
                          isMissed && styles.dayNumberBadgeMissed,
                        ]}>
                          <Text style={[
                            styles.dayNumberText,
                            dayProgress?.completed && styles.dayNumberTextCompleted,
                            isMissed && styles.dayNumberTextMissed,
                          ]}>D{day.day_number}</Text>
                        </View>
                        <View style={styles.dayTextWrap}>
                          <Text style={styles.dayTitle}>{day.title}</Text>
                          <Text style={styles.dayFocus}>{day.focus}</Text>
                        </View>
                      </View>
                      <View style={styles.dayRight}>
                        <View style={styles.dayPointsBadge}>
                          <Text style={styles.dayPointsText}>{dayPoints} pts</Text>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-forward'} size={18} color={Colors.textMuted} />
                      </View>
                    </TouchableOpacity>

                    <View style={styles.dayProgressBarBg}>
                      <View style={[styles.dayProgressBarFill, { width: `${Math.max(progressFraction * 100, dayProgress?.completed ? 100 : 0)}%` }]} />
                    </View>

                    <View style={styles.dayMetaRow}>
                      <Text style={styles.dayMetaText}>
                        {dayExerciseCount > 0 ? `${completedExerciseCount}/${dayExerciseCount} exercises completed` : `${day.sections.length} sections`}
                      </Text>
                      {isCurrentDay && !dayProgress?.completed ? (
                        <View style={styles.urgencyPill}>
                          <Ionicons name="flash" size={11} color="#FBBF24" />
                          <Text style={styles.urgencyPillText}>{t('Finish today or lose points')}</Text>
                        </View>
                      ) : null}
                      {isMissed ? <Text style={styles.dayMissedLabel}>Missed</Text> : null}
                    </View>

                    {isExpanded ? (
                      <View style={styles.dayDetails}>
                        {day.notes ? <Text style={styles.dayNotes}>{day.notes}</Text> : null}
                        {!allSectionsCompleted ? (
                          <Text style={styles.helperText}>Finish all exercises in all sections, then mark the day done.</Text>
                        ) : null}

                        {day.sections.map((section) => {
                          const sectionKey = `${day.day_number}:${section.id}`;
                          const sectionExpanded = Boolean(expandedSections[sectionKey]);
                          const sectionPoints = getSectionPoints(section, unitPointMap);
                          const sectionCompleted = Boolean(completedSectionIds.includes(section.id));
                          const completedCount = sectionCompleted ? section.exercises.length : getSectionCompletedCount(section, completedExerciseIds);
                          const totalCount = section.exercises.length;
                          const canCompleteSection = totalCount === 0 || completedCount >= totalCount;
                          return (
                            <View key={section.id} style={[styles.sectionCard, sectionCompleted && styles.sectionCardCompleted]}>
                              <TouchableOpacity
                                style={styles.sectionRow}
                                activeOpacity={0.88}
                                onPress={() => toggleSectionExpanded(sectionKey)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <View style={styles.sectionLeft}>
                                  <View style={[styles.sectionStatusDot, sectionCompleted && styles.sectionStatusDotCompleted]} />
                                  <View style={styles.sectionTextWrap}>
                                    <Text style={styles.sectionTitle}>{section.title}</Text>
                                    <Text style={styles.sectionDescription}>
                                      {section.description || `${section.estimated_minutes} min`}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.sectionRight}>
                                  <View style={styles.sectionPointsBadge}>
                                    <Text style={styles.sectionPointsText}>{sectionPoints} pts</Text>
                                  </View>
                                  <Ionicons name={sectionExpanded ? 'chevron-up' : 'chevron-forward'} size={18} color={Colors.textMuted} />
                                </View>
                              </TouchableOpacity>

                              <View style={styles.sectionMetaRow}>
                                <Text style={styles.sectionMetaText}>
                                  {totalCount > 0 ? `${completedCount}/${totalCount} exercises` : `${section.estimated_minutes} min`}
                                </Text>
                                {canUpdateProgress ? (
                                  <TouchableOpacity
                                    style={[
                                      styles.compactButton,
                                      dayProgress?.completed && styles.compactButtonCompleted,
                                      (dayProgress?.completed || !canCompleteSection) && styles.buttonDisabled,
                                    ]}
                                    disabled={Boolean(dayProgress?.completed) || !canCompleteSection || completionUpdatingKey === `section-${day.day_number}-${section.id}`}
                                    onPress={() => confirmSectionDayCompletion(day.day_number, section.id, !Boolean(dayProgress?.completed))}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    {completionUpdatingKey === `section-${day.day_number}-${section.id}` ? (
                                      <ActivityIndicator size="small" color={dayProgress?.completed ? '#001311' : Colors.primary} />
                                    ) : (
                                      <Text style={[styles.compactButtonText, dayProgress?.completed && styles.compactButtonTextCompleted]}>
                                        {dayProgress?.completed ? 'Day completed' : 'Complete section'}
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                ) : (
                                  <View style={styles.readOnlyBadge}>
                                    <Text style={styles.readOnlyBadgeText}>Read only</Text>
                                  </View>
                                )}
                              </View>
                              {!sectionCompleted && totalCount > 0 && completedCount < totalCount ? (
                                <Text style={styles.helperText}>Complete every exercise in this section before marking the section complete.</Text>
                              ) : null}

                              {sectionExpanded ? (
                                <View style={styles.exerciseList}>
                                  {section.exercises.map((exercise) => {
                                    const exerciseCompleted = isExerciseCompleted(section, exercise.id, completedExerciseIds, completedSectionIds);
                                    const exerciseKey = `exercise-${day.day_number}-${exercise.id}`;
                                    return (
                                      <View key={exercise.id} style={[styles.exerciseCard, exerciseCompleted && styles.exerciseCardCompleted]}>
                                        <View style={styles.exerciseTextWrap}>
                                          <View style={styles.exerciseTopRow}>
                                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                                            <Text style={styles.exercisePoints}>{unitPointMap[exercise.id] || 0} pts</Text>
                                          </View>
                                          <Text style={styles.exerciseDetails}>{exercise.details}</Text>
                                          {exercise.notes ? <Text style={styles.exerciseNotes}>{exercise.notes}</Text> : null}
                                          <View style={styles.exerciseActionRow}>
                                            {canUpdateProgress ? (
                                              <TouchableOpacity
                                                style={[
                                                  styles.exerciseCheck,
                                                  styles.exerciseCheckWide,
                                                  exerciseCompleted && styles.exerciseCheckCompleted,
                                                  exerciseCompleted && styles.buttonDisabled,
                                                ]}
                                                disabled={exerciseCompleted || completionUpdatingKey === exerciseKey}
                                                onPress={() => void toggleExerciseCompletion(day.day_number, section.id, exercise.id, !exerciseCompleted)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                              >
                                                {completionUpdatingKey === exerciseKey ? (
                                                  <ActivityIndicator size="small" color={exerciseCompleted ? '#001311' : Colors.primary} />
                                                ) : (
                                                  <View style={styles.exerciseCheckContent}>
                                                    <Ionicons
                                                      name={exerciseCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                                                      size={16}
                                                      color={exerciseCompleted ? '#001311' : Colors.primary}
                                                    />
                                                    <Text style={[styles.exerciseCheckText, exerciseCompleted && styles.exerciseCheckTextCompleted]}>
                                                      {exerciseCompleted ? 'Completed' : 'Complete exercise'}
                                                    </Text>
                                                  </View>
                                                )}
                                              </TouchableOpacity>
                                            ) : (
                                              <View style={[styles.readOnlyBadge, styles.readOnlyBadgeLarge]}>
                                                <Text style={styles.readOnlyBadgeText}>Read only</Text>
                                              </View>
                                            )}
                                            {exercise.workout_vimeo_id || exercise.workout_video_url ? (
                                              <TouchableOpacity
                                                onPress={() => openLinkedWorkout(exercise)}
                                                style={styles.videoButton}
                                                activeOpacity={0.85}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                              >
                                                <Ionicons name="play-circle" size={15} color="#001311" />
                                                <Text style={styles.videoButtonText}>Instruction video</Text>
                                              </TouchableOpacity>
                                            ) : null}
                                          </View>
                                        </View>
                                      </View>
                                    );
                                  })}
                                </View>
                              ) : null}
                            </View>
                          );
                        })}

                        {canUpdateProgress ? (
                          <TouchableOpacity
                            style={[
                              styles.dayDoneButton,
                              dayProgress?.completed && styles.dayDoneButtonCompleted,
                              (dayProgress?.completed || !allSectionsCompleted) && styles.buttonDisabled,
                            ]}
                            disabled={Boolean(dayProgress?.completed) || completionUpdatingKey === `day-${day.day_number}` || !allSectionsCompleted}
                            onPress={() => confirmDayCompletion(day.day_number, true)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {completionUpdatingKey === `day-${day.day_number}` ? (
                              <ActivityIndicator size="small" color={dayProgress?.completed ? '#001311' : Colors.primary} />
                            ) : (
                              <>
                                <Ionicons
                                  name={dayProgress?.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                  size={18}
                                  color={dayProgress?.completed ? '#001311' : Colors.primary}
                                />
                                <Text style={[styles.dayDoneButtonText, dayProgress?.completed && styles.dayDoneButtonTextCompleted]}>
                                  {dayProgress?.completed ? 'Day completed' : 'Mark day done'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.readOnlyNoticeInline}>
                            <Text style={styles.readOnlyNoticeInlineText}>{readOnlyReason || 'Progress is read-only right now.'}</Text>
                          </View>
                        )}
                        {dayProgress?.completed ? (
                          <View style={styles.completedDayActions}>
                            <TouchableOpacity
                              style={[styles.cardActionButton, isReportActionBusy('download', `day-${day.day_number}-download`) && styles.cardActionButtonBusy]}
                              onPress={() => void handleDownloadReport(day.day_number, `day-${day.day_number}-download`)}
                              disabled={anyReportActionBusy}
                              accessibilityLabel="Download completed challenge card"
                            >
                              {isReportActionBusy('download', `day-${day.day_number}-download`) ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="download-outline" size={20} color={Colors.primary} />}
                              <Text style={styles.cardActionText}>Download</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.cardActionButton, isReportActionBusy('share', `day-${day.day_number}-share`) && styles.cardActionButtonBusy]}
                              onPress={() => void handleShareCard(day.day_number, `day-${day.day_number}-share`)}
                              disabled={anyReportActionBusy}
                              accessibilityLabel="Share completed challenge card"
                            >
                              {isReportActionBusy('share', `day-${day.day_number}-share`) ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="share-social-outline" size={20} color={Colors.primary} />}
                              <Text style={styles.cardActionText}>Share</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    </View>
                  );
                })}
              </View>
            ) : ("""

replacement_jsx = """            {hasConfiguredPlanDays ? (
              <View style={styles.dayList}>
                {thread.plan_days.map((day) => {
                const dayProgress = dayProgressMap.get(day.day_number);
                const isExpanded = Boolean(expandedDays[day.day_number]);
                const isCurrentDay = currentCalendarDay === day.day_number && !dayProgress?.completed;
                const isMissed = !dayProgress?.completed && !isCurrentDay && day.day_number < currentCalendarDay;
                const progressFraction = getDayProgressFraction(day, dayProgress);
                const dayPoints = getDayPoints(day, unitPointMap);
                const completedExerciseIds = Array.isArray(dayProgress?.completed_exercise_ids) ? dayProgress.completed_exercise_ids : [];
                const completedSectionIds = Array.isArray(dayProgress?.completed_section_ids) ? dayProgress.completed_section_ids : [];
                const dayExerciseCount = day.sections.flatMap((section) => section.exercises).length;
                const completedExerciseCount = day.sections.reduce((total, section) => {
                  if (completedSectionIds.includes(section.id)) {
                    return total + section.exercises.length;
                  }
                  return total + getSectionCompletedCount(section, completedExerciseIds);
                }, 0);
                const allSectionsCompleted = day.sections.every((section) => completedSectionIds.includes(section.id));

                  return (
                    <View key={`day-${day.day_number}`} style={[
                      styles.dayCard,
                      isCurrentDay && styles.dayCardCurrent,
                      dayProgress?.completed && styles.dayCardCompleted,
                      isMissed && styles.dayCardMissed,
                    ]}>
                    <TouchableOpacity
                      style={styles.dayRow}
                      activeOpacity={0.88}
                      onPress={() => toggleDayExpanded(day.day_number)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View style={styles.dayLeft}>
                        <View style={[
                          styles.dayNumberBadge,
                          isCurrentDay && styles.dayNumberBadgeCurrent,
                          dayProgress?.completed && styles.dayNumberBadgeCompleted,
                          isMissed && styles.dayNumberBadgeMissed,
                        ]}>
                          <Text style={[
                            styles.dayNumberText,
                            isCurrentDay && styles.dayNumberTextCurrent,
                            dayProgress?.completed && styles.dayNumberTextCompleted,
                            isMissed && styles.dayNumberTextMissed,
                          ]}>D{day.day_number}</Text>
                        </View>
                        <View style={styles.dayTextWrap}>
                          <Text style={styles.dayTitle}>{day.title}</Text>
                          <Text style={styles.dayFocus}>{day.focus}</Text>
                        </View>
                      </View>
                      <View style={styles.dayRight}>
                        <View style={styles.dayPointsBadge}>
                          <Ionicons name="flash" size={11} color={Colors.gold} />
                          <Text style={styles.dayPointsText}>{dayPoints} pts</Text>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gold} />
                      </View>
                    </TouchableOpacity>

                    <View style={styles.dayProgressBarBg}>
                      <View
                        style={[
                          styles.dayProgressBarFill,
                          dayProgress?.completed && styles.dayProgressBarFillCompleted,
                          { width: `${Math.max(progressFraction * 100, dayProgress?.completed ? 100 : 0)}%` }
                        ]}
                      />
                    </View>

                    {/* Daily Stats Row matching strength-plan.tsx */}
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>{t('EXERCISES')}</Text>
                        <Text style={styles.statValue}>
                          {dayExerciseCount > 0 ? `${completedExerciseCount}/${dayExerciseCount}` : `${day.sections.length} ${t('sec')}`}
                        </Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>{t('POINTS')}</Text>
                        <Text style={[styles.statValue, { color: Colors.gold }]}>{dayPoints} pts</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>{t('STATUS')}</Text>
                        <Text
                          style={[
                            styles.statValue,
                            dayProgress?.completed && { color: Colors.victoryGreen },
                            isCurrentDay && { color: Colors.gold },
                            isMissed && { color: '#EF4444' },
                            !dayProgress?.completed && !isCurrentDay && !isMissed && { color: 'rgba(247, 243, 238, 0.55)' },
                            { fontSize: 11, fontFamily: Fonts.heading },
                          ]}
                        >
                          {dayProgress?.completed ? t('COMPLETED') : isCurrentDay ? t('TODAY') : isMissed ? t('MISSED') : t('UPCOMING')}
                        </Text>
                      </View>
                    </View>

                    {isCurrentDay && !dayProgress?.completed ? (
                      <View style={styles.urgencyPill}>
                        <Ionicons name="flash" size={11} color={Colors.gold} />
                        <Text style={styles.urgencyPillText}>{t('Finish today or lose points')}</Text>
                      </View>
                    ) : null}
                    {isMissed ? <Text style={styles.dayMissedLabel}>{t('Missed')}</Text> : null}

                    {isExpanded ? (
                      <View style={styles.dayDetails}>
                        {day.notes ? (
                          <View style={styles.dayNotesCard}>
                            <Ionicons name="information-circle-outline" size={16} color={Colors.gold} />
                            <Text style={styles.dayNotesText}>{day.notes}</Text>
                          </View>
                        ) : null}

                        <Text style={styles.sectionHeader}>{t("TODAY'S SECTIONS")}</Text>

                        {day.sections.map((section) => {
                          const sectionKey = `${day.day_number}:${section.id}`;
                          const sectionExpanded = Boolean(expandedSections[sectionKey]);
                          const sectionPoints = getSectionPoints(section, unitPointMap);
                          const sectionCompleted = Boolean(completedSectionIds.includes(section.id));
                          const completedCount = sectionCompleted ? section.exercises.length : getSectionCompletedCount(section, completedExerciseIds);
                          const totalCount = section.exercises.length;
                          const canCompleteSection = totalCount === 0 || completedCount >= totalCount;
                          const sectionBusy = completionUpdatingKey === `section-${day.day_number}-${section.id}`;
                          return (
                            <View key={section.id} style={[styles.sectionCard, sectionCompleted && styles.sectionCardCompleted]}>
                              <TouchableOpacity
                                style={styles.sectionRow}
                                activeOpacity={0.88}
                                onPress={() => toggleSectionExpanded(sectionKey)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <View style={styles.sectionTitleWrap}>
                                  <Text style={styles.exerciseType}>{t('SECTION')}</Text>
                                  <Text style={styles.sectionTitle}>{section.title}</Text>
                                  <Text style={styles.sectionMetaText}>
                                    {totalCount > 0 ? `${completedCount}/${totalCount} ${t('exercises')} · ${sectionPoints} pts · ${section.estimated_minutes || 10} min` : `${section.estimated_minutes || 10} min`}
                                  </Text>
                                  {section.description ? (
                                    <Text style={styles.sectionDescription}>{section.description}</Text>
                                  ) : null}
                                </View>
                                <View style={styles.sectionActions}>
                                  {canUpdateProgress ? (
                                    <TouchableOpacity
                                      style={[
                                        styles.exerciseCheckButton,
                                        sectionCompleted && styles.exerciseCheckButtonCompleted,
                                        (!canCompleteSection && !sectionCompleted) && styles.buttonDisabled,
                                      ]}
                                      activeOpacity={0.8}
                                      disabled={Boolean(dayProgress?.completed) || !canCompleteSection || sectionBusy}
                                      onPress={() => confirmSectionDayCompletion(day.day_number, section.id, !sectionCompleted)}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                      {sectionBusy ? (
                                        <ActivityIndicator size="small" color={sectionCompleted ? '#fff' : Colors.gold} />
                                      ) : (
                                        <Ionicons
                                          name={sectionCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                          size={22}
                                          color={sectionCompleted ? '#fff' : Colors.gold}
                                        />
                                      )}
                                    </TouchableOpacity>
                                  ) : (
                                    <View style={styles.readOnlyBadge}>
                                      <Text style={styles.readOnlyBadgeText}>{t('Read only')}</Text>
                                    </View>
                                  )}
                                  <Ionicons
                                    name={sectionExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color="rgba(247, 243, 238, 0.45)"
                                  />
                                </View>
                              </TouchableOpacity>

                              {sectionExpanded ? (
                                <View style={styles.sectionExercises}>
                                  {section.exercises.map((exercise) => {
                                    const exerciseCompleted = isExerciseCompleted(section, exercise.id, completedExerciseIds, completedSectionIds);
                                    const exerciseKey = `exercise-${day.day_number}-${exercise.id}`;
                                    const exerciseBusy = completionUpdatingKey === exerciseKey;
                                    const exPoints = unitPointMap[exercise.id] || 0;
                                    return (
                                      <View key={exercise.id} style={[styles.exerciseSubCard, exerciseCompleted && styles.exerciseSubCardCompleted]}>
                                        <View style={styles.exerciseHeader}>
                                          <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={styles.exerciseType}>{(section.title || 'EXERCISE').toUpperCase()}</Text>
                                            <Text style={styles.exerciseSubCardTitle}>{exercise.name}</Text>
                                          </View>
                                          {canUpdateProgress ? (
                                            <TouchableOpacity
                                              style={[
                                                styles.exerciseCheckButton,
                                                exerciseCompleted && styles.exerciseCheckButtonCompleted,
                                              ]}
                                              activeOpacity={0.8}
                                              disabled={exerciseCompleted || exerciseBusy}
                                              onPress={() => void toggleExerciseCompletion(day.day_number, section.id, exercise.id, !exerciseCompleted)}
                                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                              {exerciseBusy ? (
                                                <ActivityIndicator size="small" color={exerciseCompleted ? '#fff' : Colors.gold} />
                                              ) : (
                                                <Ionicons
                                                  name={exerciseCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                                  size={22}
                                                  color={exerciseCompleted ? '#fff' : Colors.gold}
                                                />
                                              )}
                                            </TouchableOpacity>
                                          ) : (
                                            <View style={styles.readOnlyBadge}>
                                              <Text style={styles.readOnlyBadgeText}>{t('Read only')}</Text>
                                            </View>
                                          )}
                                        </View>

                                        {/* Metrics Row matching strength-plan.tsx */}
                                        <View style={styles.exerciseMetrics}>
                                          <View style={styles.metricItem}>
                                            <Ionicons name="flash-outline" size={13} color={Colors.gold} />
                                            <Text style={styles.metricValue}>{exPoints} pts</Text>
                                          </View>
                                          {exercise.details ? (
                                            <View style={styles.metricItem}>
                                              <Ionicons name="repeat-outline" size={13} color={Colors.gold} />
                                              <Text style={styles.metricValue}>{exercise.details}</Text>
                                            </View>
                                          ) : null}
                                          {exercise.workout_vimeo_id || exercise.workout_video_url ? (
                                            <TouchableOpacity
                                              onPress={() => openLinkedWorkout(exercise)}
                                              style={[styles.metricItem, styles.metricItemVideo]}
                                              activeOpacity={0.8}
                                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                              <Ionicons name="play-circle-outline" size={13} color={Colors.gold} />
                                              <Text style={[styles.metricValue, { color: Colors.gold }]}>{t('Instruction video')}</Text>
                                            </TouchableOpacity>
                                          ) : null}
                                        </View>

                                        {exercise.notes ? (
                                          <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                                        ) : null}
                                      </View>
                                    );
                                  })}
                                </View>
                              ) : null}
                            </View>
                          );
                        })}

                        {/* Full-width Day Completion CTA Button */}
                        {canUpdateProgress ? (
                          <TouchableOpacity
                            style={[
                              styles.completeSessionBtn,
                              dayProgress?.completed && styles.completeSessionBtnCompleted,
                              (dayProgress?.completed || !allSectionsCompleted) && styles.buttonDisabled,
                            ]}
                            disabled={Boolean(dayProgress?.completed) || completionUpdatingKey === `day-${day.day_number}` || !allSectionsCompleted}
                            onPress={() => confirmDayCompletion(day.day_number, true)}
                            activeOpacity={0.8}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {completionUpdatingKey === `day-${day.day_number}` ? (
                              <ActivityIndicator size="small" color={dayProgress?.completed ? '#fff' : Colors.obsidian} />
                            ) : (
                              <>
                                <Ionicons
                                  name={dayProgress?.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                  size={20}
                                  color={dayProgress?.completed ? '#fff' : Colors.obsidian}
                                />
                                <Text style={[styles.completeSessionBtnText, dayProgress?.completed && styles.completeSessionBtnTextCompleted]}>
                                  {dayProgress?.completed ? t('DAY COMPLETED') : t('MARK DAY COMPLETED')}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.readOnlyNoticeInline}>
                            <Text style={styles.readOnlyNoticeInlineText}>{readOnlyReason || t('Progress is read-only right now.')}</Text>
                          </View>
                        )}
                        {dayProgress?.completed ? (
                          <View style={styles.completedDayActions}>
                            <TouchableOpacity
                              style={[styles.cardActionButton, isReportActionBusy('download', `day-${day.day_number}-download`) && styles.cardActionButtonBusy]}
                              onPress={() => void handleDownloadReport(day.day_number, `day-${day.day_number}-download`)}
                              disabled={anyReportActionBusy}
                              accessibilityLabel="Download completed challenge card"
                            >
                              {isReportActionBusy('download', `day-${day.day_number}-download`) ? <ActivityIndicator size="small" color={Colors.gold} /> : <Ionicons name="download-outline" size={18} color={Colors.gold} />}
                              <Text style={styles.cardActionText}>{t('Download')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.cardActionButton, isReportActionBusy('share', `day-${day.day_number}-share`) && styles.cardActionButtonBusy]}
                              onPress={() => void handleShareCard(day.day_number, `day-${day.day_number}-share`)}
                              disabled={anyReportActionBusy}
                              accessibilityLabel="Share completed challenge card"
                            >
                              {isReportActionBusy('share', `day-${day.day_number}-share`) ? <ActivityIndicator size="small" color={Colors.gold} /> : <Ionicons name="share-social-outline" size={18} color={Colors.gold} />}
                              <Text style={styles.cardActionText}>{t('Share')}</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    </View>
                  );
                })}
              </View>
            ) : ("""

if target_jsx in content:
    content = content.replace(target_jsx, replacement_jsx)
    print("Successfully replaced target_jsx!")
else:
    print("Could not find exact target_jsx! Checking line endings or partial match...")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
