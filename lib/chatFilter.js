export function filter(message) {
  const badWords = {
    en: ["fuck", "sex", "dick", "pussy", "sexy", "nigger", "fucker", "Fucker", "cock", "anal", "vagina", "ball sack", "nut sack"],
    ar: ["كس", "زانية"],
    // Add more languages and their bad words as needed
  };

  let filteredMessage = message;

  Object.values(badWords).forEach((words) => {
    words.forEach((word) => {
      const replacement = "*".repeat(word.length);
      filteredMessage = filteredMessage.split(word).join(replacement);
    });
  });

  return filteredMessage;
}
