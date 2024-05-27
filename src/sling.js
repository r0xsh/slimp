import { Settings, DateTime } from "luxon";

async function fetchData(url, token) {
  console.debug(`Fetching ${url}`);
  const response = await fetch(`https://api.getsling.com/v1${url}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  });

  return await response.json();
}

async function fetchConcise(session) {
  const url = `/${session.org.id}/users/concise?user-fields=full`;
  return await fetchData(url, session.token);
}

async function fetchSession(token) {
  const url = "/account/session";
  return await fetchData(url, token);
}

async function fetchCalendar(session, from, to) {
  from = DateTime.utc(
    from.getFullYear(),
    from.getMonth() + 1,
    from.getDate(),
    0,
    0,
    0,
  );
  to = DateTime.utc(
    to.getFullYear(),
    to.getMonth() + 1,
    to.getDate(),
    23,
    59,
    59,
  );
  const url = `/${session.org.id}/calendar/${session.org.id}/users/${session.id}?dates=${from.toISO()}/${to.toISO()}`;
  return await fetchData(url, session.token);
}

function getUserById(users, id) {
  return users.find((user) => user.id == id);
}

function getGroupById(groups, id) {
  return groups.find((group) => group.id == id);
}

// Sorting functions
function _grpSort(a, b) {
  return a.name > b.name ? 1 : -1;
}

function _dateSort(a, b) {
  return a > b ? 1 : -1;
}

function _userSort(a, b) {
  return a.id > b.id ? 1 : -1;
}

function _calSort(a, b) {
  if (a.user.id != b.user.id) {
    return _userSort(a.user, b.user);
  }
  if (a.day != b.day) {
    return _dateSort(a.day, b.day);
  }
  return 0;
}

function delta_worked_in_timerange(shift, from, to) {
  let delta = to - from;

  if (shift.end < to) {
    delta -= to - shift.end;
  }

  if (shift.start > from) {
    delta -= shift.start - from;
  }

  return delta / 60000;
}

// State building
async function getCalendar(token, from, to) {
  // Fetch session details
  const sessionData = await fetchSession(token);
  if (sessionData?.user?.timezone) {
    Settings.defaultZone = sessionData.user.timezone;
  }
  console.info(`User timezone: ${DateTime.local().zoneName}`);
  const session = {
    token: token,
    id: sessionData.user.id,
    firstname: sessionData.user.name,
    lastname: sessionData.user.lastname,
    org: {
      id: sessionData.org.id,
      name: sessionData.org.name,
    },
  };

  // Build users list
  const conciseUserData = await fetchConcise(session);
  const users = conciseUserData.users
    .map((user) => ({
      id: user.id,
      firstname: user.name,
      lastname: user.lastname,
    }))
    .sort(_userSort);

  // Build groups list
  const groups = Object.entries(conciseUserData.groups)
    .map(([_, group]) => ({
      id: group.id,
      name: group.name.trim().replaceAll(",", "，"),
    }))
    .sort(_grpSort);

  // Fetch and process calendar data
  const calendarData = await fetchCalendar(session, from, to);
  const processedCalendar = calendarData
    .filter((event) => event.type === "shift")
    .filter((event) => event.hasOwnProperty("user")) // Filter out shifts without user
    .map((event) => {
      const start = DateTime.fromISO(event.dtstart);
      const end = DateTime.fromISO(event.dtend);
      const day = DateTime.fromISO(start).startOf("day");

      return {
        id: event.id,
        day,
        notes: event.assigneeNotes,
        start,
        end,
        delta: end.diff(start, "minute").minutes,
        user: getUserById(users, event.user.id),
        task: getGroupById(groups, event.position.id),
      };
    })
    .sort(_calSort);

  return {
    data: processedCalendar,
    session,
    groups,
    users,
  };
}

function subDividDays(cal, subDivideBy) {
  const divided = cal.data
    .reduce((acc, shift) => {
      for (
        let date = shift.start;
        date <= shift.end;
        date = date.plus({ minutes: subDivideBy })
      ) {
        const end = date.plus({ minutes: subDivideBy });
        acc.push({
          ...shift,
          day: date,
          start: date,
          end,
          delta: delta_worked_in_timerange(shift, date, end),
        });
      }
      return acc;
    }, [])
    .filter((shift) => shift.delta > 0);

  return { ...cal, data: divided };
}

function toCSV(data) {
  if (!data || data.data.length === 0) {
    return "";
  }

  // Extract group names and prepare the header
  const groupNames = data.groups.reduce((acc, group, index) => {
    Object.assign(acc, {
      [group.id]: {
        ...group,
        index,
      },
    });
    return acc;
  }, {});
  const groupNamesOnly = data.groups.map((group) => group.name);
  const firstCols = ["Name", "Day", "Start", "End"];
  let csvLines = [[...firstCols, ...groupNamesOnly].join(",")]; // Header row

  let previousUser = "";
  let previousDay = "";
  let currentRow = [];

  for (const record of data.data) {
    const isNewUser = previousUser !== record.user.id;
    const isNewDay = previousDay !== record.day;

    // Start a new row for a different user or day
    if (isNewUser || isNewDay) {
      // Add the current row to CSV lines if it's not empty
      if (currentRow.length > 0) {
        csvLines.push(currentRow.join(","));
      }

      previousUser = record.user.id;
      previousDay = record.day;
      currentRow = Array(groupNamesOnly.length + firstCols.length).fill("");
    }

    // Fill the row with user details and day
    currentRow[0] = record.user.firstname + " " + record.user.lastname;
    currentRow[1] = record.day.toFormat("D");
    currentRow[2] = record.start.toFormat("tt");
    currentRow[3] = record.end.toFormat("tt");

    // Update the specific column for the task
    const taskColumnIndex = groupNames[record.task.id].index + firstCols.length;
    if (Number.isInteger(currentRow[taskColumnIndex])) {
      currentRow[taskColumnIndex] += record.delta;
    } else {
      currentRow[taskColumnIndex] = record.delta;
    }
  }

  // Add the last row to CSV lines
  if (currentRow.length > 0) {
    csvLines.push(currentRow.join(","));
  }

  return csvLines.join("\n");
}

export default {
  getCalendar,
  subDividDays,
  toCSV,
};
