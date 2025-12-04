<template>
  <div class="streak-calendar-container" :style="cssVars">
    
    <!-- Header -->
    <div class="calendar-header" :style="{ marginBottom: content.monthYearBottomMargin || '6px' }">
      
      <!-- Prev Button -->
      <button class="nav-btn" @click="changeMonth(-1)" type="button" aria-label="Previous Month">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <!-- Month & Year Title -->
      <div class="title-container" :style="{ transform: `translateY(${content.titleVerticalOffset || '0px'})` }">
        <transition :name="`slide-${slideDirection}`">
          <h2 :key="`${monthName}-${year}`" class="month-title" :style="{ fontSize: content.headerFontSize }">
            {{ monthName }} 
            <span class="year-label" :style="{ fontSize: content.yearFontSize }">
              {{ year }}
            </span>
          </h2>
        </transition>
      </div>

      <!-- Next Button -->
      <button 
        class="nav-btn" 
        @click="changeMonth(1)" 
        type="button" 
        aria-label="Next Month"
        :style="{ visibility: isCurrentMonth ? 'hidden' : 'visible' }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

    </div>

    <!-- Weekday Labels (M T W T F S S) -->
    <div class="weekdays-grid" :style="{ marginBottom: content.weekdayCalendarGap || '8px' }">
      <div 
        v-for="(day, index) in weekDays" 
        :key="index" 
        class="weekday-label"
        :style="{ fontSize: content.daysFontSize }"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-grid-container">
      <!-- Placeholder grid for height calculation -->
      <div class="days-grid days-grid-placeholder" aria-hidden="true">
        <div 
          v-for="cell in calendarGrid" 
          :key="`placeholder-${cell.key}`"
          class="day-cell-wrapper"
        >
          <div class="day-cell"></div>
        </div>
      </div>
      <!-- Animated grid overlay -->
      <transition :name="`slide-${slideDirection}`">
        <div :key="`calendar-${monthIndex}-${year}`" class="days-grid-wrapper">
          <div class="days-grid">
            <div 
              v-for="cell in calendarGrid" 
              :key="cell.key"
              class="day-cell-wrapper"
            >
              <template v-if="cell.type === 'day'">
                <!-- The Colored Streak Square -->
                <div 
                    class="day-cell"
                    :style="{ backgroundColor: cell.bgColor }"
                    @click="handleDateClick(cell.dateStr)"
                ></div>
                
                <!-- Today Indicator Circle -->
                <div 
                  v-if="cell.dateStr === todayDateStr" 
                  class="today-indicator"
                  @click="handleDateClick(cell.dateStr)"
                >
                  {{ new Date(cell.dateStr).getDate() }}
                </div>

                <!-- Target Date Cross Indicator -->
                <div 
                  v-if="cell.dateStr === targetDateStr" 
                  class="target-cross-wrapper"
                  @click="handleDateClick(cell.dateStr)"
                >
                  <svg class="target-cross-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              </template>

              <div v-else class="empty-slot"></div>
            </div>
          </div>
        </div>
      </transition>
    </div>

  </div>
</template>

<script>
import { computed, ref, watch } from 'vue';

export default {
  props: {
    content: { type: Object, required: true },
  },
  emits: ['trigger-event'],
  setup(props, { emit }) {
    
    // Internal offset to allow navigation even if bound date doesn't change
    const monthOffset = ref(0);
    // Track slide direction for animation
    const slideDirection = ref('right');

    // Watch for external date changes to reset view
    watch(() => props.content.currentDate, () => {
      monthOffset.value = 0;
    });

    // Process API Result into a map for date lookups
    const sessionData = computed(() => {
        let result = props.content?.apiResult;
        
        console.log('📅 Calendar - Raw apiResult:', result);
        console.log('📅 Calendar - apiResult type:', typeof result);
        
        // Handle CSV-style format: "date, count" pairs (space or newline separated)
        if (typeof result === 'string' && result.includes(',')) {
            console.log('📅 Calendar - Detected CSV format');
            const sessionMap = {};
            
            // Split by both newlines and spaces to handle different formats
            // Replace multiple spaces with single space, then split
            const normalized = result.replace(/\s+/g, ' ').trim();
            const parts = normalized.split(' ');
            
            // Process pairs: "date, count"
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i].trim();
                if (!part) continue;
                
                // Check if this part contains a comma (it's a "date," part)
                if (part.includes(',')) {
                    const date = part.replace(',', '').trim();
                    const countStr = parts[i + 1];
                    
                    if (countStr) {
                        const count = parseInt(countStr.replace(',', '').trim(), 10);
                        
                        if (date && !isNaN(count)) {
                            sessionMap[date] = count;
                            console.log(`  ✓ Parsed: ${date} → ${count}`);
                        }
                        i++; // Skip the count part in next iteration
                    }
                }
            }
            
            console.log('✅ Calendar - CSV Processed sessionMap:', sessionMap);
            console.log('✅ Calendar - Total dates:', Object.keys(sessionMap).length);
            return sessionMap;
        }
        
        // Handle JSON string format
        if (typeof result === 'string') {
            try {
                result = JSON.parse(result);
                console.log('📅 Calendar - Parsed JSON apiResult:', result);
            } catch (e) {
                console.error('❌ Calendar - Failed to parse apiResult:', e);
                return {};
            }
        }
        
        // Handle object format with "return" array
        if (!result || !Array.isArray(result.return)) {
            console.warn('⚠️ Calendar - Invalid apiResult format. Expected: {return: [{date, count}]} or CSV format');
            console.log('📅 Calendar - result.return:', result?.return);
            return {};
        }
        
        const sessionMap = {};
        result.return.forEach(item => {
            if (item.date && typeof item.count === 'number') {
                sessionMap[item.date] = item.count;
            }
        });
        
        console.log('✅ Calendar - Processed sessionMap:', sessionMap);
        console.log('✅ Calendar - Total dates:', Object.keys(sessionMap).length);
        
        return sessionMap;
    });
    const displayedDate = computed(() => {
        let base = new Date();
        if (props.content.currentDate) {
            const d = new Date(props.content.currentDate);
            if (!isNaN(d.getTime())) base = d;
        }
        // Apply offset
        base.setMonth(base.getMonth() + monthOffset.value);
        return base;
    });

    const year = computed(() => displayedDate.value.getFullYear());
    const monthIndex = computed(() => displayedDate.value.getMonth()); 
    const monthName = computed(() => displayedDate.value.toLocaleString('default', { month: 'long' }));
    
    // API month and year values (1-indexed month for API)
    const apiMonth = computed(() => monthIndex.value + 1); // 1-12
    const apiYear = computed(() => year.value);
    
    // Calculate Today's date string in YYYY-MM-DD format based on local client time
    const todayDateStr = computed(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });

    // Check if currently displayed month is the current real-time month (or future)
    const isCurrentMonth = computed(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // If displayed year is greater than current year, it's future (shouldn't happen with restriction but good for safety)
        if (year.value > currentYear) return true;
        
        // If same year and displayed month is >= current month, it's current or future
        if (year.value === currentYear && monthIndex.value >= currentMonth) return true;
        
        return false;
    });

    // Calculate Target/Interview date string
    const targetDateStr = computed(() => {
        if (!props.content.targetDate) return null;
        const d = new Date(props.content.targetDate);
        if (isNaN(d.getTime())) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    // CSS Variables for easier styling
    const cssVars = computed(() => ({
        '--sc-empty': props.content.emptyColor || '#F3F4F6',
        '--sc-text': props.content.textColor || '#111827',
        '--sc-radius': props.content.borderRadius || '8px',
        '--sc-font': props.content.globalFontFamily || 'inherit',
        '--sc-cal-padding': props.content.calendarPadding || '16px',
        '--sc-day-gap': props.content.dayCellGap || '8px',
        
        // Header & Typography Bindings
        '--sc-title-col': props.content.monthTitleColor || '#222',
        '--sc-title-gap': props.content.monthYearGap || '12px',
        '--sc-year-col': props.content.yearTextColor || '#888',
        '--sc-weekday-col': props.content.weekdayTextColor || '#7c7c7c',
        '--sc-arrow-col': props.content.arrowIconColor || '#111827',
        '--sc-arrow-radius': props.content.arrowIconRadius || '50%',
        
        // Today Indicator Vars
        '--sc-today-bg': props.content.todayCircleColor || '#2563EB',
        '--sc-today-text': props.content.todayTextColor || '#FFFFFF',
        '--sc-today-size': props.content.todayCircleSize || '32px',
        '--sc-today-fs': props.content.todayFontSize || '14px',
        '--sc-today-border-col': props.content.todayCircleBorderColor || 'transparent',
        '--sc-today-border-width': props.content.todayCircleBorderWidth || '0px',

        // Target/Cross Indicator Vars
        '--sc-cross-col': props.content.targetCrossColor || '#EF4444',
        '--sc-cross-size': props.content.targetCrossSize || '24px',
        '--sc-cross-width': props.content.targetCrossWidth || '3px',
        
        // Date Box Colors
        '--sc-color-1': props.content.dateBoxColor1 || '#4F46E5',
        '--sc-color-2': props.content.dateBoxColor2 || '#10B981',
    }));

    const calendarGrid = computed(() => {
      const y = year.value;
      const m = monthIndex.value;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const firstDayNative = new Date(y, m, 1).getDay(); 
      // Convert Sun(0)...Sat(6) to Mon(0)...Sun(6)
      const startDayOffset = firstDayNative === 0 ? 6 : firstDayNative - 1;

      const grid = [];
      for (let i = 0; i < startDayOffset; i++) {
        grid.push({ type: 'empty', key: `empty-${i}` });
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const count = sessionData.value[dateStr] || 0;
        
        let bgColor = 'var(--sc-empty)';
        if (count >= 3) {
            bgColor = 'var(--sc-color-2)';
        } else if (count >= 1) {
            bgColor = 'var(--sc-color-1)';
        }

        grid.push({
          type: 'day',
          key: dateStr,
          dateStr,
          bgColor,
          count
        });
      }
      return grid;
    });

    const changeMonth = (dir) => {
      // Prevent going to future months
      if (dir > 0 && isCurrentMonth.value) return;

      // Set slide direction before changing month
      // Left arrow (dir < 0) should slide right, right arrow (dir > 0) should slide left
      slideDirection.value = dir > 0 ? 'left' : 'right';
      monthOffset.value += dir;
      const eventName = dir > 0 ? 'onNextMonth' : 'onPrevMonth';
      emit('trigger-event', { name: eventName, event: { newDate: displayedDate.value.toISOString() } });
    };

    const handleDateClick = (dateStr) => {
      emit('trigger-event', { name: 'onDateClick', event: { date: dateStr } });
    };


    return {
      year,
      monthName,
      monthIndex,
      apiMonth,
      apiYear,
      weekDays,
      calendarGrid,
      changeMonth,
      handleDateClick,
      cssVars,
      slideDirection,
      todayDateStr,
      targetDateStr,
      isCurrentMonth
    };
  }
};
</script>

<style scoped>
.streak-calendar-container {
  font-family: var(--sc-font);
  color: var(--sc-text);
  user-select: none;
  width: 100%;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* Margin bottom is handled inline for reactivity */
}

.nav-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: var(--sc-arrow-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sc-arrow-col);
  opacity: 0.6;
  transition: all 0.2s;
}

.nav-btn:hover {
  opacity: 1;
  background-color: rgba(0,0,0,0.05);
}

.month-title {
  margin: 0;
  font-weight: bold;
  display: flex;
  align-items: baseline;
  gap: var(--sc-title-gap);
  position: absolute;
  width: 100%;
  justify-content: center;
  color: var(--sc-title-col);
}

.year-label {
  /* Removed opacity to allow full color control via prop */
  font-weight: bold;
  color: var(--sc-year-col);
}

.weekdays-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-columns: repeat(7, 1fr);
  gap: var(--sc-day-gap);
  /* Match the left/right padding of the days-grid-wrapper so columns align */
  padding: 0 var(--sc-cal-padding);
}

.weekday-label {
  text-align: center;
  font-weight: bold;
  /* Removed opacity to allow full color control via prop */
  text-transform: uppercase;
  color: var(--sc-weekday-col);
}

/* Container for calendar grid with overflow hidden - THE SCREEN */
.calendar-grid-container {
  overflow: hidden;
  position: relative;
  width: 100%;
  /* No padding here, padding is on the inner wrapper to create safe zone */
  padding: 0; 
  box-sizing: border-box;
}

.days-grid-wrapper {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
  /* Add padding to wrapper to allow elements to 'pop out' of grid but stay in container */
  padding: var(--sc-cal-padding);
  box-sizing: border-box;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-columns: repeat(7, 1fr);
  gap: var(--sc-day-gap);
}

/* Placeholder must match wrapper dimensions perfectly including padding */
.days-grid-placeholder {
  visibility: hidden;
  pointer-events: none;
  padding: var(--sc-cal-padding);
  box-sizing: border-box;
}

.day-cell-wrapper {
  aspect-ratio: 1 / 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.day-cell {
  width: 100%;
  height: 100%;
  background-color: var(--sc-empty);
  border-radius: var(--sc-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.day-cell.is-completed {
  background-color: #4F46E5; 
}

.day-cell:hover {
  opacity: 0.8;
  transform: scale(0.95);
}

/* TODAY INDICATOR STYLES */
.today-indicator {
  position: absolute;
  z-index: 10;
  width: var(--sc-today-size);
  height: var(--sc-today-size);
  background-color: var(--sc-today-bg);
  color: var(--sc-today-text);
  font-size: var(--sc-today-fs);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  border: var(--sc-today-border-width) solid var(--sc-today-border-col);
  box-sizing: border-box;
}

/* TARGET CROSS STYLES */
.target-cross-wrapper {
  position: absolute;
  z-index: 20; /* Sits above Today if they overlap */
  width: var(--sc-cross-size);
  height: var(--sc-cross-size);
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none; /* Let clicks pass through */
}

.target-cross-icon {
  width: 100%;
  height: 100%;
  stroke: var(--sc-cross-col);
  stroke-width: var(--sc-cross-width);
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Container for title with overflow hidden */
.title-container {
  overflow: hidden;
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 40px;
}

/* Slide animations */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>