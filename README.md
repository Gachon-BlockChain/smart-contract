# smart-contract
## GifticonMarketPlace
| 함수 이름           | 설명             | 입력값                                       | 반환값                           | 접근 제한          | 발생 이벤트                               |
| --------------- | -------------- | ----------------------------------------- | ----------------------------- | -------------- | ------------------------------------ |
| `listItem`      | NFT 판매 등록      | `tokenId (uint256)`, `price (uint256)`    | 없음                            | 소유자만 가능        | `ItemListed(tokenId, seller, price)` |
| `cancelListing` | NFT 판매 취소      | `tokenId (uint256)`                       | 없음                            | 판매자만 가능        | `ItemCanceled(tokenId)`              |
| `buyItem`       | NFT 구매         | `tokenId (uint256)`<br>`msg.value`: 가격 이상 | 없음                            | 외부 지갑          | `ItemSold(tokenId, buyer, price)`    |
| `getListings`   | 판매 중인 토큰 목록 조회 | 없음                                        | `uint256[]`: 판매 중인 tokenId 배열 | 모두             | 없음                                   |
| `withdraw`      | 마켓플레이스 잔고 인출   | 없음                                        | 없음                            | **owner only** | 없음                                   |


## GifticonNFT
| 함수 이름                    | 설명                     | 입력값                                                                                                                           | 반환값                | 접근 제한            | 발생 이벤트                            |
| ------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------- | --------------------------------- |
| `registerGifticon`       | 기프티콘 등록 + NFT 발행       | `ipfsHash (string)`, `tokenURI (string)`, `expiryDate (uint256)`, `depositAmount (uint256)`<br>+ `msg.value == depositAmount` | 없음                 | 모든 사용자           | `GifticonRegistered`              |
| `redeemGifticon`         | 구매자가 NFT 교환 요청         | `tokenId (uint256)`                                                                                                           | 없음                 | NFT 소유자          | `GifticonRedeemed`                |
| `reportFraud`            | 사기 신고                  | `tokenId (uint256)`                                                                                                           | 없음                 | 누구나              | `FraudReported`, `PenaltyApplied` |
| `refundDeposit`          | 담보 반환 + NFT 소각         | `tokenId (uint256)`                                                                                                           | 없음                 | 원래 소유자, 보유 중인 자만 | 없음                                |
| `withdraw`               | 컨트랙트 잔고 인출             | 없음                                                                                                                            | 없음                 | **owner only**   | 없음                                |
| `tokensOfOwner`          | 소유자의 모든 tokenId 반환     | `owner (address)`                                                                                                             | `uint256[]`        | 모두               | 없음                                |
| `gifticonsWithIdOfOwner` | 소유자의 모든 Gifticon 정보 반환 | `owner (address)`                                                                                                             | `GifticonWithId[]` | 모두               | 없음                                |
