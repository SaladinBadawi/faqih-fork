# Faqih's look

## Logo

- **Mark:** the letter ف in the eight-pointed hizb star (۞) of the mushaf.
  It is drawn as shapes (no font) in `components/logo.tsx` and
  `app/icon.svg`. The home-screen icons (`app/apple-icon.png`,
  `public/icon-*.png`) and `app/favicon.ico` are the mark on navy.
- **Name:** both languages, the app's language first. فقيه in Reem Kufi
  (bold) over Faqih in Nunito in Arabic, and the other way round in English
  (`<Logo />`).

## Colours

Tailwind colours `brand` and `gold` (`tailwind.config.ts`).

| Colour                                | Used for                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `brand` (navy, `brand-700` = #1b3a6b) | The app: main buttons, headers, the menu, what is selected, progress                                    |
| `gold` (`gold-400` = #ffc800)         | What is achieved (cleared surahs, exams, ticks), ayah numbers ﴿١﴾, today's wird, and "Continue" on navy |
| green                                 | Only a right answer                                                                                     |
| rose                                  | Only a wrong answer, and hearts                                                                         |
| amber                                 | Notes and warnings (e.g. "reference pending")                                                           |
| orange                                | Points                                                                                                  |

Button variants (`components/ui/button.tsx`): `secondary` is the main action
(navy), `primary` the lighter blue one, `gold` the one on navy.
