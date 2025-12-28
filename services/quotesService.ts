export type QuoteCategory = 'stoicism' | 'motivation' | 'mindfulness' | 'creativity' | 'business' | 'discipline';

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: QuoteCategory;
}

const quotes: Quote[] = [
  // Stoicism
  { id: 's1', text: "Мы страдаем чаще в воображении, чем в действительности.", author: "Сенека", category: "stoicism" },
  { id: 's2', text: "Счастье вашей жизни зависит от качества ваших мыслей.", author: "Марк Аврелий", category: "stoicism" },
  { id: 's3', text: "То, что стоит на пути, становится путем.", author: "Марк Аврелий", category: "stoicism" },
  { id: 's4', text: "Человека возмущают не сами вещи, а то, как он их воспринимает.", author: "Эпиктет", category: "stoicism" },
  
  // Motivation & Discipline
  { id: 'm1', text: "Начинай оттуда, где ты есть. Используй то, что у тебя есть. Делай то, что можешь.", author: "Артур Эш", category: "motivation" },
  { id: 'm2', text: "Не ждите. Время никогда не будет «самым подходящим».", author: "Наполеон Хилл", category: "motivation" },
  { id: 'm3', text: "Действие — это основной ключ к успеху.", author: "Пабло Пикассо", category: "motivation" },
  { id: 'd1', text: "Дисциплина — это решение делать то, чего очень не хочется делать, чтобы достичь того, чего очень хочется достичь.", author: "Джон Максвелл", category: "discipline" },
  { id: 'd2', text: "Мы — это то, что мы делаем постоянно. Совершенство — это не действие, а привычка.", author: "Аристотель", category: "discipline" },

  // Mindfulness
  { id: 'mi1', text: "Секрет перемен состоит в том, чтобы сосредоточить всю свою энергию не на борьбе со старым, а на создании нового.", author: "Сократ", category: "mindfulness" },
  { id: 'mi2', text: "Вчера я был умным, и поэтому я хотел изменить мир. Сегодня я стал мудрым, и поэтому я меняю себя.", author: "Джалаладдин Руми", category: "mindfulness" },
  { id: 'mi3', text: "Смотрите вглубь себя, и вы обнаружите, что не являетесь ни телом, ни разумом, а чем-то большим.", author: "Экхарт Толле", category: "mindfulness" },

  // Creativity
  { id: 'c1', text: "Вдохновение существует, но оно должно застать вас за работой.", author: "Пабло Пикассо", category: "creativity" },
  { id: 'c2', text: "Творчество требует смелости отказаться от уверенности.", author: "Эрих Фромм", category: "creativity" },
  { id: 'c3', text: "Не бойтесь совершенства. Вам его никогда не достичь.", author: "Сальвадор Дали", category: "creativity" },

  // Business
  { id: 'b1', text: "Самый опасный яд — чувство достижения цели. Противоядие — каждый вечер думать, что можно сделать лучше завтра.", author: "Ингвар Кампрад", category: "business" },
  { id: 'b2', text: "Если вы не готовы ошибаться, вы никогда не придумаете ничего оригинального.", author: "Кен Робинсон", category: "business" },
];

export const getRandomQuote = (): Quote => {
  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index];
};

export const getAllQuotes = (): Quote[] => quotes;

export const getQuotesByCategory = (category: QuoteCategory | 'all'): Quote[] => {
    if (category === 'all') return quotes;
    return quotes.filter(q => q.category === category);
};

export const CATEGORIES: {id: QuoteCategory | 'all', label: string}[] = [
    { id: 'all', label: 'Все' },
    { id: 'stoicism', label: 'Стоицизм' },
    { id: 'discipline', label: 'Дисциплина' },
    { id: 'motivation', label: 'Мотивация' },
    { id: 'creativity', label: 'Творчество' },
    { id: 'mindfulness', label: 'Осознанность' },
    { id: 'business', label: 'Дело' },
];