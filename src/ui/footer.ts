/**
 * הפוטר הקבוע — קרדיט "חולמים תקשוב" וכפתור משוב.
 * יעד המשוב מוגדר כאן במקום אחד; להחלפה בטופס או בכתובת אחרת.
 */

export const CREDIT_URL = 'https://chepti.com'
export const FEEDBACK_URL = 'mailto:chepti@gmail.com?subject=' + encodeURIComponent('משוב על מסנן התוכן')

const HEART_ICON = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
</svg>`

const MESSAGE_ICON = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
</svg>`

export function renderFooter(host: HTMLElement): void {
  host.className = 'site-footer'
  host.innerHTML = `
    <span class="credit" title="פיתוח ועיצוב — חולמים תקשוב">
      ${HEART_ICON}
      <span>נבנה על ידי <a href="${CREDIT_URL}" target="_blank" rel="noopener">חולמים תקשוב</a></span>
    </span>
    <a class="btn btn-ghost" href="${FEEDBACK_URL}" target="_blank" rel="noopener"
       title="יש הערה, תקלה או רעיון? נשמח לשמוע">
      ${MESSAGE_ICON}
      <span>משוב</span>
    </a>`
}
