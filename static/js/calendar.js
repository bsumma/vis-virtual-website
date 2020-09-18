function make_cal(name) {
  return new Promise((resolve) => {
    // ...promise fulfilled after cal is rendered.

    const current_tz = getUrlParameter('tz') || moment.tz.guess();
    const tzNames = [...moment.tz.names()];

    const setupTZSelector = () => {
      const tzOptons = d3.select('#tzOptions')
      tzOptons.selectAll('option').data(tzNames)
        .join('option')
        .attr('data-tokens', d => d.split("/").join(" "))
        .text(d => d)
      $('.selectpicker')
        .selectpicker('val', current_tz)
        .on('changed.bs.select',
          function (e, clickedIndex, isSelected, previousValue) {
            new_tz = tzNames[clickedIndex]
            window.open(window.location.pathname + '?tz=' + new_tz, '_self');
          })
    }

    setupTZSelector();

    // requires moments.js
    const enumerateDaysBetweenDates = function (startDate, endDate) {
      const dates = [];

      // console.log(startDate, endDate, "--- startDate, endDate");

      const currDate = moment(startDate);
      const lastDate = moment(endDate);

      dates.push(currDate.clone());
      while (currDate.add(1, 'days').diff(lastDate) < 0) {
        // console.log(currDate, "--- currDate");
        dates.push(currDate.clone());
      }

      dates.push(lastDate);
      return dates;
    };


    $.get('serve_config.json').then(config => {
      $.get(name).then(events => {

        const all_cals = [];
        const timezoneName = current_tz;

        const min_date = d3.min(events.map(e => e.start));
        var min_hours = d3.min(
          events.map(e => moment(e.start).tz(timezoneName).hours())) - 1;
        var max_hours = d3.max(
          events.map(e => moment(e.end).tz(timezoneName).hours())) + 1;
        if (min_hours < 0 || max_hours > 24) {
          min_hours = 0;
          max_hours = 24;
        }
        // console.log(min_hours, max_hours);
        const Calendar = tui.Calendar;
        const calendar = new Calendar('#calendar', {
          defaultView: 'week',
          isReadOnly: true,
          // useDetailPopup: true,
          taskView: false,
          scheduleView: ['time'],
          usageStatistics: false,
          week: {
            startDayOfWeek: 6, // IEEE VIS starts on Saturday
            workweek: !config.calendar["sunday_saturday"],
            hourStart: min_hours,
            hourEnd: max_hours
          },
          timezones: [{
            timezoneOffset: -moment.tz.zone(timezoneName)
              .utcOffset(moment(min_date)),
            displayLabel: timezoneName,
            tooltip: timezoneName
          }],
          // timezones: [{
          //     getTimezoneOffset: 540,
          //     displayLabel: 'a',
          //     tooltip: timezoneName
          // }],
          template: {
            monthDayname: function (dayname) {
              return '<span class="calendar-week-dayname-name">' + dayname.label + '</span>';
            },
            time: function (schedule) {
              return '<strong>' + moment(schedule.start.getTime())
                .tz(timezoneName)
                .format('hh:mm') + '</strong> ' + schedule.title;
            },
            milestone: function (schedule) {
              return '<span class="calendar-font-icon ic-milestone-b"></span> <span style="background-color: ' + schedule.bgColor + '"> M: ' + schedule.title + '</span>';
            },
            weekDayname: function (model) {
              const parts = model.renderDate.split('-');
              return '<span class="tui-full-calendar-dayname-name"> ' + parts[1] + '/' + parts[2] + '</span>&nbsp;&nbsp;<span class="tui-full-calendar-dayname-name">' + model.dayName + '</span>';
            },
          },
        });
        calendar.setDate(Date.parse(min_date));
        calendar.createSchedules(events);
        calendar.on({
          'clickSchedule': function (e) {
            const s = e.schedule
            if (s.location.length > 0) {
              window.open(s.location, '_blank');
            }
          },
        })

        all_cals.push(calendar);

        const cols = config.calendar.colors;
        if (cols) {
          const cals = [];
          Object.keys(cols).forEach(k => {
            const v = cols[k];
            cals.push({
              id: k,
              name: k,
              color: getTextColorByBackgroundColor(v),
              bgColor: v,
            })
          })

          calendar.setCalendars(cals);
        }

        const week_dates = enumerateDaysBetweenDates(
          calendar.getDateRangeStart().toDate(),
          calendar.getDateRangeEnd().toDate()
        );

        // const c_sm = d3.select('#calendar_small')
        let i = 1;
        for (const day of week_dates) {
          // c_sm.append('div').attr('id', 'cal__' + i);
          const cal = new Calendar('#cal__' + i, {
            defaultView: 'day',
            isReadOnly: true,
            // useDetailPopup: true,
            taskView: false,
            scheduleView: ['time'],
            usageStatistics: false,

            week: {
              startDayOfWeek: 6, // IEEE VIS starts on Saturday
              workweek: !config.calendar["sunday_saturday"],
              hourStart: min_hours,
              hourEnd: max_hours
            },
            timezones: [{
              timezoneOffset: -moment.tz.zone(timezoneName)
                .utcOffset(moment(min_date)),
              displayLabel: timezoneName,
              tooltip: timezoneName
            }],
          })

          cal.setDate(day.toDate());
          cal.createSchedules(events);
          cal.on({
            'clickSchedule': function (e) {
              const s = e.schedule
              if (s.location.length > 0) {
                window.open(s.location, '_blank');
              }
            },
          })

          all_cals.push(cal);
          const cols = config.calendar.colors;
          if (cols) {
            const cals = [];
            Object.keys(cols).forEach(k => {
              const v = cols[k];
              cals.push({
                id: k,
                name: k,
                color: getTextColorByBackgroundColor(v),
                bgColor: v,
              })
            })

            cal.setCalendars(cals);

          }

          i++;

          // console.log(day.format(), "--- day");
        }

        // force render:
        all_cals.forEach(c => c.render(true));

        // ***  PROMISE FULFILLED *** //
        resolve({
          render: () => all_cals.forEach(c => c.render(true))
        });

      })

    })
  })

}

function getTextColorByBackgroundColor(hexColor) {
  hexColor = hexColor.replace("#", "");
  let r = parseInt(hexColor.substr(0, 2), 16);
  let g = parseInt(hexColor.substr(2, 2), 16);
  let b = parseInt(hexColor.substr(4, 2), 16);
  let yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}
