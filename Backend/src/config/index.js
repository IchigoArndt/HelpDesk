const config = {
  port: process.env.PORT || 3000,
  // Membros gerados pela massa de volume (seed) usam este domínio e não entram
  // na listagem/ranking de membros, para não encobrir pessoas reais.
  fillerEmailDomain: "massa.circuito.example",
};

module.exports = config;
