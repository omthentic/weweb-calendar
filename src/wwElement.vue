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
      <button class="nav-btn" @click="changeMonth(1)" type="button" aria-label="Next Month">
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
import { computed, ref, watch, onMounted } from 'vue';

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
    // Store session data from API
    const sessionData = ref({});

    // Watch for external date changes to reset view
    watch(() => props.content.currentDate, () => {
      monthOffset.value = 0;
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
    
    // Calculate Today's date string in YYYY-MM-DD format based on local client time
    const todayDateStr = computed(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

    // Fetch calendar data from API
    const fetchCalendarData = async () => {
      const payload = {
        month: monthIndex.value + 1, // 1-indexed for API
        year: year.value,
        user_id: props.content.user_id || 10 // Default to 10 if not set
      };
      
      try {
        const response = await fetch('https://xtdz-pj2k-avay.a2.xano.io/api:9A1JJPSy/calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          console.error('Failed to fetch calendar data:', response.statusText);
          return;
        }
        
        const data = await response.json();
        console.log('Calendar data fetched:', data);
        
        // Process data into a map for easier lookup: { "YYYY-MM-DD": count }
        const sessionMap = {};
        if (data && Array.isArray(data.return)) {
            data.return.forEach(item => {
                if (item.date && typeof item.count === 'number') {
                    sessionMap[item.date] = item.count;
                }
            });
        }
        sessionData.value = sessionMap;
        
        // Emitting an event with the fetched data so the parent can handle it if needed
        emit('trigger-event', { name: 'onDataFetched', event: { data } });
        
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      }
    };

    // Fetch on mount
    onMounted(() => {
      fetchCalendarData();
    });

    // Watch for month/year changes to refetch
    watch([monthIndex, year, () => props.content.user_id], () => {
      fetchCalendarData();
    });

    return {
      year,
      monthName,
      monthIndex,
      weekDays,
      calendarGrid,
      changeMonth,
      handleDateClick,
      cssVars,
      slideDirection,
      todayDateStr,
      targetDateStr
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
  gap: 8px;
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
  gap: 8px;
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