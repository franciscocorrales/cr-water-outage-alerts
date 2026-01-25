/**
 * Water service location hierarchy: province → canton → district.
 *
 * The numeric IDs here are the same ones used by the public
 * water utility API (FkProvincia, FkCanton, FkDistrito).
 * query parameters (FkProvincia, FkCanton, FkDistrito).
 *
 * This is intentionally a small seed set; more locations can be
 * added over time, and a future options UI can read from this
 * structure to let users pick multiple areas to monitor.
 */
const AYA_LOCATIONS = {
  provinces: {
    /**
     * Provincia: San José
     * FkProvincia = 1
     */
    1: {
      id: 1,
      name: 'San José',
      cantons: {
        // Placeholder for future cantons in San José.
        // Example structure when added:
        // 1: { id: 1, name: 'Central', districts: { ... } }
      }
    },

    /**
     * Provincia: Alajuela
     * FkProvincia = 2
     */
    2: {
      id: 2,
      name: 'Alajuela',
      cantons: {
        /**
         * Cantón: San Ramón
         * FkCanton = 29
         */
        29: {
          id: 29,
          name: 'San Ramón',
          districts: {
            /**
             * Distrito: San Juan
             * FkDistrito = 231
             */
            231: {
              id: 231,
              name: 'San Juan'
            },

            /**
             * Distrito: Piedades Norte
             * FkDistrito = 232
             */
            232: {
              id: 232,
              name: 'Piedades Norte'
            }
          }
        },

        /**
         * Cantón: Grecia
         * FkCanton = 30
         *
         * Districts for Grecia can be filled in later as needed.
         */
        30: {
          id: 30,
          name: 'Grecia',
          districts: {
            // To be populated with district IDs and names.
          }
        }
      }
    }
  }
};
