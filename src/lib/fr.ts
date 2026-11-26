// Typographie française : espace insécable avant ? ! : ; » et après «.
export const fr = (s: string): string =>
  s.replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ").replace(/ (\d)/g, " $1");
