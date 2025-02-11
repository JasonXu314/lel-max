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
};
}  // namespace lellib

#endif