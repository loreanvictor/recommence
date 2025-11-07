<br/>

<img src="./logo-dark.svg#gh-dark-mode-only" height="48px"/>
<img src="./logo-light.svg#gh-light-mode-only" height="48px"/>

<br/>

long running workflows that can be resumed:

```ts
import { replayable, step, sleep, hook } from 'replayed'


//
// verifying user email is a long running process, it requires
// waiting on user input (e.g. email confirmation), might include long waits
// (e.g. remind the user after a day), etc.
//
// `replayable()` functions enable this kind of long running process.
// they persist their state, so can be replayed from the beginning safely
// by remembering where in the process we got previously. they can be
// put to sleep for time consuming tasks and indeterminate waits, and replayed
// after said task is done. they can safely recover from interrupts (runtime reboot,
// redeploys, etc) by replaying and resuming their work.
//
const verifyEmail = replayable('verify-email', async (userid, email) => {

  //
  // `fetchUserData()` here is defined as a `step()` (see below),
  // which means its state will be remembered on replay, and its previously
  // calculated result will be used. it also means it is going to be retried
  // upon failure a few times.
  //
  const { name } = await fetchUserData(userid)

  //
  // a hook is a point where we wait for
  // an external event, which can also take
  // a long time to occur, like the user confirming
  // their email address.
  //
  const confirm = await hook()
  await sendVerificationEmail(email, name, confirm.token)

  //
  // we wait one day for the user to confirm
  // the email address, after that the process
  // is finished so the hook won't work anymore.
  //
  const approved = await Promise.race([
    sleep('1 day'),
    confirm.once(),
  ])

  if (approved) {
    await markEmailVerified(userid, email)

    //
    // if approved, after 30 days we send a follow-up
    // email to check on our lovely new user.
    //
    await ('30 days')
    await sendFollowUpEmail(email)
  } else {
    //
    // remind the user to verify their email,
    // though the process would need to be restarted.
    //
    await sendReminderEmail(email)
  }
})

//
// these are defined as steps, meaning their state
// will be remembered upon replay so they won't be executed
// again, instead their previous result is used. steps also
// get retried a few times if they are failed.
//
const fetchUserData = step(async userid => { ... })
const sendVerificationEmail = step(async (email, name, token) => ...)
const markEmailVerified = step(async (userid, email) => ...)
// ...
```
