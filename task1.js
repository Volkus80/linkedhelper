'use strict'


let obj =  {
    
    chislo: 8, 
      massivChisel: [7, 8, 3, 4, 5, 6, 1, 2],
      result: [[1, 3, 4], [1, 2, 5], [3, 5], [2, 6], [1, 7], [8]]
      };


function sostavChisla(massivChisel, chislo) {
    const getSum = (nums) => nums.reduce((a,b) => a+b);
    const result = [];
    let sums = [];
    massivChisel.sort((a,b) => b-a);

    while (massivChisel.length > 0) {
        if (massivChisel[0] === chislo) {
            result.push([chislo]);
            massivChisel.shift();
        }

        if (getSum(massivChisel) < chislo) {
            break;
        }

        if (getSum(massivChisel) === chislo) {
            result.push(massivChisel);
            break;
        }

        const main = massivChisel.splice(0,1);
        
        for (let elem of massivChisel) {
            sums.push([...main, elem]);
        }

        result.push(...sums);

        while (sums.length > 0) {
            sums = sums.filter(elem => elem.slice(-1)[0] !== massivChisel.slice(-1)[0]);
            const newSums = [];

            sums.forEach((elem) => {
                let last = elem.slice(-1)[0];
                let index = massivChisel.indexOf(last);
                for (let i = index+1; i < massivChisel.length; i++) {
                    newSums.push([...elem, massivChisel[i]]);
                }
            });
            sums = [...newSums];
            result.push(...sums);
        }
    }
    
    return result.filter(elem => getSum(elem) === chislo).map(elem => elem.reverse()).reverse();
}


console.log(sostavChisla(obj.massivChisel, obj.chislo));
console.log(obj.result);
