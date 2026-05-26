/**
 * Розрахунок оцінки за 12-бальною шкалою на основі швидкості (зн/хв) та точності.
 * 
 * Початковий рівень (1-3 бали): < 50 зн/хв
 * Середній рівень (4-6 балів): 51–95 зн/хв
 * Достатній рівень (7-9 балів): 96–140 зн/хв
 * Високий рівень (10-12 балів): > 140 зн/хв (з високою точністю)
 */
export function calculateSchoolGrade(cpm, accuracy) {
  let baseGrade = 0;
  let level = "";

  if (cpm < 50) {
    // 1-3 бали
    level = "Початковий";
    if (cpm < 20) baseGrade = 1;
    else if (cpm < 35) baseGrade = 2;
    else baseGrade = 3;
  } else if (cpm <= 95) {
    // 4-6 балів
    level = "Середній";
    if (cpm < 65) baseGrade = 4;
    else if (cpm < 80) baseGrade = 5;
    else baseGrade = 6;
  } else if (cpm <= 140) {
    // 7-9 балів
    level = "Достатній";
    if (cpm < 110) baseGrade = 7;
    else if (cpm < 125) baseGrade = 8;
    else baseGrade = 9;
  } else {
    // 10-12 балів
    level = "Високий";
    if (cpm < 160) baseGrade = 10;
    else if (cpm < 180) baseGrade = 11;
    else baseGrade = 12;
  }

  // Штраф за точність: 
  // Якщо точність < 97%, знижуємо оцінку для високого рівня (максимум 9 балів)
  // Якщо точність < 90%, знижуємо на 1-2 бали загалом
  let finalGrade = baseGrade;

  if (baseGrade >= 10 && accuracy < 97) {
    finalGrade = Math.min(finalGrade, 9);
  }

  if (accuracy < 90) {
    finalGrade = Math.max(1, finalGrade - 1);
  }
  if (accuracy < 80) {
    finalGrade = Math.max(1, finalGrade - 1);
  }

  // Re-adjust level if grade dropped
  if (finalGrade <= 3) level = "Початковий";
  else if (finalGrade <= 6) level = "Середній";
  else if (finalGrade <= 9) level = "Достатній";
  else level = "Високий";

  return {
    grade: finalGrade,
    level,
    cpm
  };
}
