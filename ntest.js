function getLateWord() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('hi')
    }, 100);
  });
}

async function log() {
  console.log(await getLateWord());
}

log()
