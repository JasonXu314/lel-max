#ifndef RANGE_CHECKS_H
#define RANGE_CHECKS_H

#include <limits>

namespace lellib {
template <typename T>
struct addition {
	template <T val>
	static constexpr T maxPositive() {
		return std::numeric_limits<T>::max() - val;
	}

	template <T val>
	static constexpr T minNegative() {
		return std::numeric_limits<T>::min() - val;
	}

	static inline bool safe(T a, T b) { return b < 0 ? a >= std::numeric_limits<T>::min() - b : a <= std::numeric_limits<T>::max() - b; }
};

template <typename T, T max>
struct ubound_addition {
	template <T val>
	static constexpr T maxPositive() {
		return max - val;
	}

	template <T val>
	static constexpr T minNegative() {
		return std::numeric_limits<T>::min() - val;
	}
};

template <typename T, T min>
struct lbound_addition {
	template <T val>
	static constexpr T maxPositive() {
		return std::numeric_limits<T>::max() - val;
	}

	template <T val>
	static constexpr T minNegative() {
		return min - val;
	}
};

template <typename T, T min, T max>
struct rbound_addition {
	template <T val>
	static constexpr T maxPositive() {
		return max - val;
	}

	template <T val>
	static constexpr T minNegative() {
		return min - val;
	}
};

template <typename T>
struct subtraction {
	template <T val>
	static constexpr T minPositive() {
		return std::numeric_limits<T>::min() + val;
	}

	template <T val>
	static constexpr T maxNegative() {
		return std::numeric_limits<T>::max() + val;
	}

	static inline bool safe(T a, T b) { return b < 0 ? a <= std::numeric_limits<T>::max() + b : a >= std::numeric_limits<T>::min() + b; }
};
}  // namespace lellib

#endif