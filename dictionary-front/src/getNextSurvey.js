function getNextSurvey() {
  const now = new Date();
  const nowMs = now.getTime(); // UTC epoch ms

  // UTC 연도/월/일 정보를 얻기 위해 getUTCFullYear, getUTCMonth 등을 사용
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0 ~ 11

  // 해당 연도 year, 월 month(0~11)에 대해 cron의 day-of-month '*/3' 스케줄인 1일부터 시작해 3씩 증가하는 날짜 리스트를 생성
  function getScheduledDays(y, m) {
    const days = [];
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    for (let d = 1; d <= lastDay; d += 3) {
      days.push(d);
    }
    return days;
  }

  let candidateMs = null;

  // 이번 달 후보들 중 now 이후인 첫 번째 실행 시점을 찾기
  const daysThisMonth = getScheduledDays(year, month);
  for (const day of daysThisMonth) {
    const execMs = Date.UTC(year, month, day, 15, 0, 0);
    if (execMs > nowMs) {
      candidateMs = execMs;
      break;
    }
  }

  // 이번 달 후보가 이미 모두 지났다면, 다음 달로 넘어가 첫 번째 날짜(=1일)의 15:00 UTC 선택
  if (candidateMs === null) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const daysNextMonth = getScheduledDays(year, month);
    if (daysNextMonth.length > 0) {
      const firstDay = daysNextMonth[0]; // 보통 1일
      candidateMs = Date.UTC(year, month, firstDay, 15, 0, 0);
    } else {
      return getNextSurvey();
    }
  }

  // 남은 시간 계산
  const diffMs = candidateMs - nowMs;
  let remainingSec = Math.floor(diffMs / 1000);
  const daysLeft = Math.floor(remainingSec / (24 * 3600));
  remainingSec %= 24 * 3600;
  const hoursLeft = Math.floor(remainingSec / 3600);
  remainingSec %= 3600;
  const minutesLeft = Math.floor(remainingSec / 60);
  const secondsLeft = remainingSec % 60;

  const nextExecutionDate = new Date(candidateMs);

  return {
    days: daysLeft,
    hours: hoursLeft,
    minutes: minutesLeft,
    seconds: secondsLeft
  };
}

export default getNextSurvey;