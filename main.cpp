#include <iostream>
#include <iostream>
#include <iostream>
#include <iostream>
int main() {
    int i;
    i = (0);
    while ((i) < (100)) {
        if (((i) % (15)) == (0)) {
            std::cout << ("FizzBuzz") << std::endl;
        } else {
            if (((i) % (5)) == (0)) {
                std::cout << ("Buzz") << std::endl;
            } else {
                if (((i) % (3)) == (0)) {
                    std::cout << ("Fizz") << std::endl;
                } else {
                    std::cout << (i) << std::endl;
                }
            }
        }
        i = ((i) + (1));
    }
    return 0;
}
